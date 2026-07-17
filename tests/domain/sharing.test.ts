import { describe, expect, it } from 'vitest';

import type { BucketContribution, BucketInvite, BucketMember, ContributionMutationRecord } from '@/modules/data-access';
import { applyContributionMutation, assertAssignableRole, buildGroupOrderLines, buildJoinCode, computeAggregate, createBucket, detectAggregateDrift, generateInviteToken, hashInviteToken, inviteExpiryIso, inviteExpiryMillis, isInviteUsable, MAX_CONTRIBUTION_QUANTITY, memberCan, omitKey, parseJoinCode, roleAllows, toOrderParticipants } from '@/modules/data-access';

const contribution = (
  userId: string,
  quantities: Record<string, number>,
  revision = 1,
): BucketContribution => ({
  bucketId: 'b1',
  userId,
  displayName: userId,
  quantities,
  revision,
  lastMutationId: 'm0',
  updatedAt: '2026-07-13T00:00:00.000Z',
});

const baseState = (
  overrides: Partial<{
    bucketRevision: number;
    aggregate: Record<string, number>;
    contribution: BucketContribution | null;
    appliedMutation: ContributionMutationRecord | null;
  }> = {},
) => ({
  bucketRevision: 1,
  aggregate: {},
  contribution: null,
  appliedMutation: null,
  ...overrides,
});

const input = (
  overrides: Partial<Parameters<typeof applyContributionMutation>[1]> = {},
): Parameters<typeof applyContributionMutation>[1] => ({
  mutationId: 'm1',
  bucketId: 'b1',
  itemId: 'item-a',
  userId: 'u1',
  displayName: 'User One',
  operation: 'set',
  value: 3,
  occurredAt: '2026-07-13T01:00:00.000Z',
  ...overrides,
});

describe('contribution mutation engine', () => {
  it('applies an absolute set and materializes the aggregate', () => {
    const result = applyContributionMutation(baseState(), input());
    expect(result.alreadyApplied).toBe(false);
    expect(result.contribution.quantities).toEqual({ 'item-a': 3 });
    expect(result.aggregate).toEqual({ 'item-a': 3 });
    expect(result.bucketRevision).toBe(2);
    expect(result.record.appliedDelta).toBe(3);
    expect(result.record.resultQuantity).toBe(3);
  });

  it('applies increments as deltas on the existing quantity', () => {
    const state = baseState({
      aggregate: { 'item-a': 5 },
      contribution: contribution('u1', { 'item-a': 2 }),
    });
    const result = applyContributionMutation(state, input({ operation: 'increment', value: 2, mutationId: 'm2' }));
    expect(result.contribution.quantities['item-a']).toBe(4);
    expect(result.aggregate['item-a']).toBe(7);
    expect(result.record.appliedDelta).toBe(2);
  });

  it('computes negative deltas when lowering a quantity', () => {
    const state = baseState({
      aggregate: { 'item-a': 5 },
      contribution: contribution('u1', { 'item-a': 4 }),
    });
    const result = applyContributionMutation(state, input({ value: 1, mutationId: 'm3' }));
    expect(result.record.appliedDelta).toBe(-3);
    expect(result.aggregate['item-a']).toBe(2);
  });

  it('is idempotent: replaying the same mutation id returns the recorded result untouched', () => {
    const first = applyContributionMutation(baseState(), input());
    const replay = applyContributionMutation(
      baseState({
        bucketRevision: first.bucketRevision,
        aggregate: first.aggregate,
        contribution: first.contribution,
        appliedMutation: first.record,
      }),
      input(),
    );
    expect(replay.alreadyApplied).toBe(true);
    expect(replay.aggregate).toEqual(first.aggregate);
    expect(replay.bucketRevision).toBe(first.bucketRevision);
    expect(replay.record).toEqual(first.record);
  });

  it('preserves both users under interleaved (transaction-serialized) updates', () => {
    // Firestore serializes contending transactions on the bucket doc; model that
    // as sequential engine applications and assert no lost update.
    const first = applyContributionMutation(baseState(), input({ userId: 'u1', value: 3 }));
    const second = applyContributionMutation(
      baseState({
        bucketRevision: first.bucketRevision,
        aggregate: first.aggregate,
        contribution: null, // u2 has their own doc
      }),
      input({ userId: 'u2', displayName: 'User Two', value: 4, mutationId: 'm2' }),
    );
    expect(second.aggregate['item-a']).toBe(7);
    expect(second.bucketRevision).toBe(3);
    expect(computeAggregate([first.contribution, second.contribution])).toEqual({ 'item-a': 7 });
  });

  it('rejects non-integer, negative, and over-limit quantities', () => {
    expect(() => applyContributionMutation(baseState(), input({ value: 2.5 }))).toThrow(/whole number/);
    expect(() =>
      applyContributionMutation(
        baseState({ contribution: contribution('u1', { 'item-a': 1 }) }),
        input({ operation: 'increment', value: -2, mutationId: 'm4' }),
      ),
    ).toThrow(/whole number/);
    expect(() =>
      applyContributionMutation(baseState(), input({ value: MAX_CONTRIBUTION_QUANTITY + 1 })),
    ).toThrow(/whole number/);
  });

  it('drops zeroed quantities from contribution and aggregate maps', () => {
    const state = baseState({
      aggregate: { 'item-a': 2, 'item-b': 1 },
      contribution: contribution('u1', { 'item-a': 2 }),
    });
    const result = applyContributionMutation(state, input({ value: 0, mutationId: 'm5' }));
    expect(result.contribution.quantities).toEqual({});
    expect(result.aggregate).toEqual({ 'item-b': 1 });
  });
});

describe('aggregate repair', () => {
  it('detects drift between materialized and derived aggregates', () => {
    const contributions = [contribution('u1', { a: 2 }), contribution('u2', { a: 1, b: 4 })];
    expect(detectAggregateDrift({ a: 3, b: 4 }, contributions).drifted).toBe(false);
    const drift = detectAggregateDrift({ a: 9 }, contributions);
    expect(drift.drifted).toBe(true);
    expect(drift.expected).toEqual({ a: 3, b: 4 });
  });
});

describe('invite protocol', () => {
  it('generates unique 144-bit tokens and stable SHA-256 hashes', async () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[a-f0-9]{36}$/);
    expect(generateInviteToken()).not.toBe(token);
    const hash = await hashInviteToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(await hashInviteToken(token)).toBe(hash);
  });

  it('round-trips join codes and rejects malformed ones', () => {
    const token = generateInviteToken();
    const code = buildJoinCode('bucket_abc', token);
    expect(parseJoinCode(code)).toEqual({ bucketId: 'bucket_abc', token });
    expect(parseJoinCode('nonsense')).toBeNull();
    expect(parseJoinCode('bucket_abc.')).toBeNull();
    expect(parseJoinCode('.deadbeef')).toBeNull();
    expect(parseJoinCode('bucket.abc.SHORT')).toBeNull();
  });

  it('enforces pending status and expiry', () => {
    const createdAt = '2026-07-13T00:00:00.000Z';
    const invite: BucketInvite = {
      id: 'hash', bucketId: 'b1', bucketTitle: 'T', ownerName: 'O', role: 'contributor',
      status: 'pending', createdBy: 'u1', createdAt,
      expiresAt: inviteExpiryIso(createdAt), expiresAtMillis: inviteExpiryMillis(createdAt),
      acceptedBy: null, acceptedAt: null, revokedAt: null,
    };
    expect(isInviteUsable(invite, '2026-07-13T12:00:00.000Z')).toBe(true);
    expect(isInviteUsable(invite, '2026-07-17T00:00:00.000Z')).toBe(false);
    expect(isInviteUsable({ ...invite, status: 'accepted' })).toBe(false);
    expect(isInviteUsable({ ...invite, status: 'revoked' })).toBe(false);
  });
});

describe('role permission matrix', () => {
  it('matches the documented capability table', () => {
    expect(roleAllows('owner', 'manageMembers')).toBe(true);
    expect(roleAllows('owner', 'deleteBucket')).toBe(true);
    expect(roleAllows('editor', 'editBucket')).toBe(true);
    expect(roleAllows('editor', 'placeGroupOrder')).toBe(true);
    expect(roleAllows('editor', 'manageMembers')).toBe(false);
    expect(roleAllows('contributor', 'contribute')).toBe(true);
    expect(roleAllows('contributor', 'editBucket')).toBe(false);
    expect(roleAllows('contributor', 'placeGroupOrder')).toBe(false);
    expect(roleAllows('viewer', 'view')).toBe(true);
    expect(roleAllows('viewer', 'contribute')).toBe(false);
  });

  it('denies revoked members regardless of role', () => {
    const member: BucketMember = {
      userId: 'u2', displayName: 'U2', email: 'u2@example.com', role: 'editor',
      status: 'revoked', invitedBy: 'u1', joinedAt: 'x', updatedAt: 'x',
    };
    expect(memberCan(member, 'contribute')).toBe(false);
    expect(memberCan({ ...member, status: 'active' }, 'contribute')).toBe(true);
  });

  it('never assigns ownership through invites or role changes', () => {
    expect(() => assertAssignableRole('owner')).toThrow(/Ownership/);
    expect(assertAssignableRole('editor')).toBe('editor');
  });
});

describe('group order snapshots', () => {
  it('builds lines from the aggregate of active items and sorts participants', () => {
    const bucket = {
      ...createBucket({ id: 'u1', displayName: 'Owner' }, {
        title: 'Team lunch', description: '', currency: 'EGP',
        items: [
          { id: 'a', name: 'Foul', description: '', category: '', unitPrice: 10, active: true },
          { id: 'b', name: 'Taameya', description: '', category: '', unitPrice: 5, active: false },
        ],
      }),
      aggregate: { a: 4, b: 9 },
    };
    const lines = buildGroupOrderLines(bucket);
    expect(lines).toEqual([{ id: 'a', bucketItemId: 'a', name: 'Foul', quantity: 4, unitPrice: 10 }]);
    const participants = toOrderParticipants([
      contribution('zed', { a: 1 }),
      contribution('amy', { a: 3 }),
      contribution('empty', {}),
    ]);
    expect(participants.map((p) => p.userId)).toEqual(['amy', 'zed']);
  });
});

describe('omitKey', () => {
  it('removes only the requested key immutably', () => {
    const source = { a: 1, b: 2 };
    expect(omitKey(source, 'a')).toEqual({ b: 2 });
    expect(source).toEqual({ a: 1, b: 2 });
  });
});
