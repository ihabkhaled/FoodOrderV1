import { beforeEach, describe, expect, it } from 'vitest';

import type { ProfileDefaults, SessionUser } from '@/modules/data-access';
import { LocalAuthService, LocalDataService, LocalSharingService } from '@/modules/data-access';

const defaults: ProfileDefaults = { locale: 'en', theme: 'system', defaultCurrency: 'EGP' };
const auth = new LocalAuthService();
const data = new LocalDataService();
const sharing = new LocalSharingService();

/** Minimal typed view of the persisted local database for corruption tests. */
interface StoredDatabase {
  buckets: Record<string, { id: string; aggregate: Record<string, number> }[]>;
  sharing: {
    invites: Record<string, { id: string; expiresAt: string; expiresAtMillis: number }[]>;
  };
}
const DB_KEY = 'foodorder:v1:database';
const readStored = (): StoredDatabase =>
  JSON.parse(localStorage.getItem(DB_KEY) ?? '{}') as StoredDatabase;
const writeStored = (database: StoredDatabase): void => {
  localStorage.setItem(DB_KEY, JSON.stringify(database));
};

const registerUser = (name: string): Promise<SessionUser> =>
  auth.register(name, `${name.toLowerCase().replaceAll(' ', '.')}@example.com`, 'Password1', defaults);

const createSharedBucket = async (owner: SessionUser) => {
  const bucket = await data.createBucket(owner, {
    title: 'Team lunch',
    description: 'Friday group order',
    currency: 'EGP',
    items: [
      { id: '', name: 'Foul', description: '', category: '', unitPrice: 10, active: true },
      { id: '', name: 'Koshary', description: '', category: '', unitPrice: 45, active: true },
    ],
  });
  await sharing.enableSharing(owner, bucket.id);
  const shared = await data.getBucket(owner, bucket.id);
  if (!shared) throw new Error('expected shared bucket');
  return shared;
};

const join = async (owner: SessionUser, bucketId: string, member: SessionUser, role: 'editor' | 'contributor' | 'viewer') => {
  const { joinCode } = await sharing.createInvite(owner, bucketId, role);
  return sharing.acceptJoinCode(member, joinCode);
};

describe('local sharing integration', () => {
  beforeEach(() => { localStorage.clear(); });

  it('runs the full collaboration journey: share → invite → join → contribute → group order', async () => {
    const owner = await registerUser('Owner One');
    const bucket = await createSharedBucket(owner);
    const [foul, koshary] = bucket.items;
    if (!foul || !koshary) throw new Error('expected items');

    const { invite, joinCode } = await sharing.createInvite(owner, bucket.id, 'contributor');
    expect(invite.status).toBe('pending');
    expect(joinCode).toContain(bucket.id);

    const friend = await registerUser('Friend Two');
    const preview = await sharing.previewJoinCode(joinCode);
    expect(preview.bucketTitle).toBe('Team lunch');
    await sharing.acceptJoinCode(friend, joinCode);

    const sharedWithFriend = await sharing.listSharedWithMe(friend);
    expect(sharedWithFriend.map((item) => item.id)).toEqual([bucket.id]);

    // Both users contribute to the same item; totals aggregate both.
    await sharing.setContribution(owner, bucket.id, foul.id, 'set', 2, 'owner-m1');
    await sharing.setContribution(friend, bucket.id, foul.id, 'set', 3, 'friend-m1');
    await sharing.setContribution(friend, bucket.id, koshary.id, 'increment', 1, 'friend-m2');

    const view = await sharing.getSharedBucketView(friend, bucket.id);
    expect(view?.bucket.aggregate).toEqual({ [foul.id]: 5, [koshary.id]: 1 });
    expect(view?.contributions).toHaveLength(2);
    expect(view?.myRole).toBe('contributor');

    // Duplicate replay of an applied mutation must not double-apply (idempotency).
    const replay = await sharing.setContribution(friend, bucket.id, foul.id, 'set', 3, 'friend-m1');
    expect(replay.appliedDelta).toBe(3);
    const afterReplay = await sharing.getSharedBucketView(friend, bucket.id);
    expect(afterReplay?.bucket.aggregate[foul.id]).toBe(5);

    // Group order snapshots aggregate + participant breakdown; history is immutable.
    const order = await sharing.placeGroupOrder(owner, bucket.id, 'no onions');
    expect(order.participants).toHaveLength(2);
    expect(order.total).toBe(5 * 10 + 1 * 45);
    expect(order.sourceBucketRevision).toBeGreaterThan(1);
    await sharing.setContribution(friend, bucket.id, foul.id, 'set', 9, 'friend-m3');
    const storedOrder = await data.getOrder(owner.id, order.id);
    expect(storedOrder?.lines.find((line) => line.bucketItemId === foul.id)?.quantity).toBe(5);

    // Activity recorded the journey.
    const activity = await sharing.listActivity(owner, bucket.id);
    const types = activity.map((event) => event.type);
    expect(types).toContain('bucket_shared');
    expect(types).toContain('member_joined');
    expect(types).toContain('contribution_updated');
    expect(types).toContain('order_placed');
  });

  it('enforces roles: viewers cannot contribute, contributors cannot edit structure or order', async () => {
    const owner = await registerUser('Owner One');
    const bucket = await createSharedBucket(owner);
    const [foul] = bucket.items;
    if (!foul) throw new Error('expected item');

    const viewer = await registerUser('View Only');
    await join(owner, bucket.id, viewer, 'viewer');
    await expect(
      sharing.setContribution(viewer, bucket.id, foul.id, 'set', 1, 'v-m1'),
    ).rejects.toThrow(/permission/);

    const contributor = await registerUser('Contrib User');
    await join(owner, bucket.id, contributor, 'contributor');
    await expect(
      data.updateBucket(contributor, bucket.id, {
        title: 'Hijacked', description: '', currency: 'EGP',
        items: bucket.items.map(({ id, name, description, category, unitPrice, active, sortOrder }) => ({ id, name, description, category, unitPrice, active, sortOrder })),
      }),
    ).rejects.toThrow(/permission/);
    await expect(sharing.placeGroupOrder(contributor, bucket.id, '')).rejects.toThrow(/permission/);

    // Promotion to editor unlocks structural edits.
    await sharing.changeMemberRole(owner, bucket.id, contributor.id, 'editor');
    const renamed = await data.updateBucket(contributor, bucket.id, {
      title: 'Team lunch v2', description: '', currency: 'EGP',
      items: bucket.items.map(({ id, name, description, category, unitPrice, active, sortOrder }) => ({ id, name, description, category, unitPrice, active, sortOrder })),
    });
    expect(renamed.title).toBe('Team lunch v2');
  });

  it('blocks revoked members and removes access after leaving', async () => {
    const owner = await registerUser('Owner One');
    const bucket = await createSharedBucket(owner);
    const [foul] = bucket.items;
    if (!foul) throw new Error('expected item');

    const revoked = await registerUser('Revoked Soon');
    await join(owner, bucket.id, revoked, 'contributor');
    await sharing.setContribution(revoked, bucket.id, foul.id, 'set', 2, 'r-m1');
    await sharing.revokeMember(owner, bucket.id, revoked.id);
    await expect(
      sharing.setContribution(revoked, bucket.id, foul.id, 'set', 5, 'r-m2'),
    ).rejects.toThrow(/permission/);
    expect(await sharing.listSharedWithMe(revoked)).toHaveLength(0);
    // Contributions are retained in totals (product rule).
    const view = await sharing.getSharedBucketView(owner, bucket.id);
    expect(view?.bucket.aggregate[foul.id]).toBe(2);

    const leaver = await registerUser('Leaves Later');
    await join(owner, bucket.id, leaver, 'contributor');
    await sharing.leaveBucket(leaver, bucket.id);
    expect(await sharing.listSharedWithMe(leaver)).toHaveLength(0);
    await expect(sharing.leaveBucket(owner, bucket.id)).rejects.toThrow(/owner cannot leave/i);
  });

  it('rejects invalid, expired, reused, and revoked invites', async () => {
    const owner = await registerUser('Owner One');
    const bucket = await createSharedBucket(owner);
    await expect(sharing.previewJoinCode('garbage')).rejects.toThrow(/not valid/);

    const { invite, joinCode } = await sharing.createInvite(owner, bucket.id, 'contributor');
    const first = await registerUser('First Joiner');
    await sharing.acceptJoinCode(first, joinCode);
    const second = await registerUser('Second Joiner');
    // Single-use: the accepted invite cannot admit another user.
    await expect(sharing.acceptJoinCode(second, joinCode)).rejects.toThrow(/expired|already used/);

    const { invite: revokable, joinCode: revokableCode } = await sharing.createInvite(owner, bucket.id, 'editor');
    await sharing.revokeInvite(owner, bucket.id, revokable.id);
    await expect(sharing.previewJoinCode(revokableCode)).rejects.toThrow(/expired|already used/);

    // Expiry: rewind the stored expiry timestamp and expect rejection.
    const { invite: expiring, joinCode: expiringCode } = await sharing.createInvite(owner, bucket.id, 'viewer');
    const db = readStored();
    const stored = db.sharing.invites[bucket.id]?.find((item) => item.id === expiring.id);
    if (!stored) throw new Error('expected stored invite');
    stored.expiresAt = '2020-01-01T00:00:00.000Z';
    stored.expiresAtMillis = Date.parse('2020-01-01T00:00:00.000Z');
    writeStored(db);
    await expect(sharing.previewJoinCode(expiringCode)).rejects.toThrow(/expired|already used/);
    expect(invite.status).toBe('pending');
  });

  it('detects and repairs aggregate drift from durable contributions', async () => {
    const owner = await registerUser('Owner One');
    const bucket = await createSharedBucket(owner);
    const [foul] = bucket.items;
    if (!foul) throw new Error('expected item');
    await sharing.setContribution(owner, bucket.id, foul.id, 'set', 4, 'o-m1');

    // Corrupt the materialized aggregate directly in storage.
    const db = readStored();
    const stored = db.buckets[owner.id]?.find((item) => item.id === bucket.id);
    if (!stored) throw new Error('expected stored bucket');
    stored.aggregate[foul.id] = 999;
    writeStored(db);

    const repaired = await sharing.repairAggregate(owner, bucket.id);
    expect(repaired.drifted).toBe(true);
    expect(repaired.bucket.aggregate[foul.id]).toBe(4);
    const second = await sharing.repairAggregate(owner, bucket.id);
    expect(second.drifted).toBe(false);
  });

  it('cascades bucket deletion and supports export + account deletion', async () => {
    const owner = await registerUser('Owner One');
    const bucket = await createSharedBucket(owner);
    const friend = await registerUser('Friend Two');
    await join(owner, bucket.id, friend, 'contributor');

    const exported = await data.exportUserData(friend, defaults);
    expect(exported.memberships).toEqual([
      { bucketId: bucket.id, bucketTitle: bucket.title, role: 'contributor' },
    ]);

    await data.deleteBucket(owner, bucket.id);
    expect(await sharing.listSharedWithMe(friend)).toHaveLength(0);
    expect(await sharing.getSharedBucketView(owner, bucket.id)).toBeNull();

    await data.deleteAllUserData(friend);
    await auth.deleteAccount(friend);
    await expect(data.getProfile(friend, defaults)).rejects.toThrow(/not found/);
  });
});
