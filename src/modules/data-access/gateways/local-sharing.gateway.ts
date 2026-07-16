import { nowIso } from '@/lib/date';

import type { SharedBucketView, SharingService } from '../contracts/sharing-service.interfaces';
import { createOrder } from '../helpers/order.helper';
import {
  applyContributionMutation,
  assertAssignableRole,
  buildGroupOrderLines,
  buildJoinCode,
  computeAggregate,
  detectAggregateDrift,
  generateInviteToken,
  hashInviteToken,
  inviteExpiryIso,
  inviteExpiryMillis,
  isActiveMember,
  isInviteUsable,
  MAX_BUCKET_MEMBERS,
  memberCan,
  parseJoinCode,
  toOrderParticipants,
} from '../helpers/sharing.helper';
import type {
  Bucket,
  BucketActivityEvent,
  BucketInvite,
  BucketMember,
  BucketRole,
  ContributionMutationRecord,
  ContributionOperation,
  Order,
  SessionUser,
} from '../types/domain.types';
import {
  appendActivity,
  findBucketEntry,
  memberOf,
  readDatabase,
  roleOf,
  seedOwnerMember,
  storeBucket,
  writeDatabase,
} from './local-database.helper';

export class LocalSharingService implements SharingService {
  async listSharedWithMe(user: SessionUser): Promise<Bucket[]> {
    const database = readDatabase();
    return structuredClone(
      Object.values(database.buckets)
        .flat()
        .filter(
          (bucket) =>
            bucket.ownerId !== user.id && isActiveMember(memberOf(database, bucket.id, user.id)),
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    );
  }

  async getSharedBucketView(user: SessionUser, bucketId: string): Promise<SharedBucketView | null> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) return null;
    const myRole = roleOf(database, entry.bucket, user.id);
    if (!myRole) return null;
    return structuredClone({
      bucket: entry.bucket,
      members: (database.sharing.members[bucketId] ?? []).filter(
        (member) => member.status === 'active',
      ),
      contributions: database.sharing.contributions[bucketId] ?? [],
      myRole,
    });
  }

  async enableSharing(user: SessionUser, bucketId: string): Promise<Bucket> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) throw new Error('Bucket was not found.');
    if (entry.bucket.ownerId !== user.id) throw new Error('You do not have permission for this action.');
    if (entry.bucket.visibility === 'shared') return structuredClone(entry.bucket);
    const shared: Bucket = {
      ...entry.bucket,
      visibility: 'shared',
      revision: entry.bucket.revision + 1,
      updatedAt: nowIso(),
    };
    storeBucket(database, entry, shared);
    seedOwnerMember(database, shared);
    appendActivity(database, bucketId, user, 'bucket_shared', 'bucket', bucketId, {
      title: shared.title,
    });
    writeDatabase(database);
    return structuredClone(shared);
  }

  async createInvite(
    user: SessionUser,
    bucketId: string,
    role: Exclude<BucketRole, 'owner'>,
  ): Promise<{ invite: BucketInvite; joinCode: string }> {
    assertAssignableRole(role);
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) throw new Error('Bucket was not found.');
    if (entry.bucket.ownerId !== user.id) throw new Error('You do not have permission for this action.');
    if (entry.bucket.visibility !== 'shared') throw new Error('Enable sharing before inviting members.');
    const token = generateInviteToken();
    const tokenHash = await hashInviteToken(token);
    const createdAt = nowIso();
    const invite: BucketInvite = {
      id: tokenHash,
      bucketId,
      bucketTitle: entry.bucket.title,
      ownerName: entry.bucket.ownerName,
      role,
      status: 'pending',
      createdBy: user.id,
      createdAt,
      expiresAt: inviteExpiryIso(createdAt),
      expiresAtMillis: inviteExpiryMillis(createdAt),
      acceptedBy: null,
      acceptedAt: null,
      revokedAt: null,
    };
    database.sharing.invites[bucketId] = [invite, ...(database.sharing.invites[bucketId] ?? [])];
    appendActivity(database, bucketId, user, 'invite_created', 'invite', invite.id, { role });
    writeDatabase(database);
    return { invite: structuredClone(invite), joinCode: buildJoinCode(bucketId, token) };
  }

  async listInvites(user: SessionUser, bucketId: string): Promise<BucketInvite[]> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry || entry.bucket.ownerId !== user.id) throw new Error('You do not have permission for this action.');
    return structuredClone(database.sharing.invites[bucketId] ?? []);
  }

  async revokeInvite(user: SessionUser, bucketId: string, inviteId: string): Promise<void> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry || entry.bucket.ownerId !== user.id) throw new Error('You do not have permission for this action.');
    const invites = database.sharing.invites[bucketId] ?? [];
    const invite = invites.find((item) => item.id === inviteId);
    if (!invite || invite.status !== 'pending') return;
    invite.status = 'revoked';
    invite.revokedAt = nowIso();
    appendActivity(database, bucketId, user, 'invite_revoked', 'invite', inviteId, {});
    writeDatabase(database);
  }

  async previewJoinCode(code: string): Promise<BucketInvite> {
    const parsed = parseJoinCode(code);
    if (!parsed) throw new Error('This join code is not valid.');
    const database = readDatabase();
    const tokenHash = await hashInviteToken(parsed.token);
    const invite = (database.sharing.invites[parsed.bucketId] ?? []).find(
      (item) => item.id === tokenHash,
    );
    if (!invite) throw new Error('This join code is not valid.');
    if (!isInviteUsable(invite)) throw new Error('This invite has expired or was already used.');
    return structuredClone(invite);
  }

  async acceptJoinCode(user: SessionUser, code: string): Promise<Bucket> {
    const parsed = parseJoinCode(code);
    if (!parsed) throw new Error('This join code is not valid.');
    const database = readDatabase();
    const tokenHash = await hashInviteToken(parsed.token);
    const invite = (database.sharing.invites[parsed.bucketId] ?? []).find(
      (item) => item.id === tokenHash,
    );
    if (!invite) throw new Error('This join code is not valid.');
    if (!isInviteUsable(invite)) throw new Error('This invite has expired or was already used.');
    const entry = findBucketEntry(database, parsed.bucketId);
    if (!entry || entry.bucket.visibility !== 'shared') throw new Error('This join code is not valid.');
    if (entry.bucket.ownerId === user.id) throw new Error('You are already a member of this bucket.');
    const members = database.sharing.members[parsed.bucketId] ?? [];
    const existing = members.find((member) => member.userId === user.id);
    if (existing && existing.status === 'active') throw new Error('You are already a member of this bucket.');
    const activeCount = members.filter((member) => member.status === 'active').length;
    if (activeCount >= MAX_BUCKET_MEMBERS) throw new Error(`A bucket supports up to ${MAX_BUCKET_MEMBERS} members.`);
    const at = nowIso();
    if (existing) {
      existing.status = 'active';
      existing.role = invite.role;
      existing.invitedBy = invite.createdBy;
      existing.updatedAt = at;
    } else {
      members.push({
        userId: user.id,
        displayName: user.displayName,
        email: user.email,
        role: invite.role,
        status: 'active',
        invitedBy: invite.createdBy,
        joinedAt: at,
        updatedAt: at,
      });
    }
    database.sharing.members[parsed.bucketId] = members;
    invite.status = 'accepted';
    invite.acceptedBy = user.id;
    invite.acceptedAt = at;
    appendActivity(database, parsed.bucketId, user, 'member_joined', 'member', user.id, {
      role: invite.role,
    });
    writeDatabase(database);
    return structuredClone(entry.bucket);
  }

  async changeMemberRole(
    user: SessionUser,
    bucketId: string,
    memberId: string,
    role: Exclude<BucketRole, 'owner'>,
  ): Promise<BucketMember> {
    assertAssignableRole(role);
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry || entry.bucket.ownerId !== user.id) throw new Error('You do not have permission for this action.');
    if (memberId === entry.bucket.ownerId) throw new Error('Ownership cannot be assigned through invites or role changes.');
    const member = memberOf(database, bucketId, memberId);
    if (!isActiveMember(member)) throw new Error('Member was not found.');
    member.role = role;
    member.updatedAt = nowIso();
    appendActivity(database, bucketId, user, 'member_role_changed', 'member', memberId, {
      role,
      memberName: member.displayName,
    });
    writeDatabase(database);
    return structuredClone(member);
  }

  async revokeMember(user: SessionUser, bucketId: string, memberId: string): Promise<void> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry || entry.bucket.ownerId !== user.id) throw new Error('You do not have permission for this action.');
    if (memberId === entry.bucket.ownerId) throw new Error('The owner cannot be removed. Delete the bucket instead.');
    const member = memberOf(database, bucketId, memberId);
    if (!isActiveMember(member)) return;
    member.status = 'revoked';
    member.updatedAt = nowIso();
    // Product rule: contributions are retained in totals for order history accuracy.
    appendActivity(database, bucketId, user, 'member_revoked', 'member', memberId, {
      memberName: member.displayName,
    });
    writeDatabase(database);
  }

  async leaveBucket(user: SessionUser, bucketId: string): Promise<void> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) return;
    if (entry.bucket.ownerId === user.id) throw new Error('The owner cannot leave. Delete the bucket instead.');
    const member = memberOf(database, bucketId, user.id);
    if (!isActiveMember(member)) return;
    member.status = 'left';
    member.updatedAt = nowIso();
    appendActivity(database, bucketId, user, 'member_left', 'member', user.id, {});
    writeDatabase(database);
  }

  async setContribution(
    user: SessionUser,
    bucketId: string,
    itemId: string,
    operation: ContributionOperation,
    value: number,
    mutationId: string,
  ): Promise<ContributionMutationRecord> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) throw new Error('Bucket was not found.');
    const isOwner = entry.bucket.ownerId === user.id;
    const member = memberOf(database, bucketId, user.id);
    if (!isOwner && !memberCan(member, 'contribute')) throw new Error('You do not have permission for this action.');
    const item = entry.bucket.items.find((candidate) => candidate.id === itemId);
    if (!item?.active) throw new Error('This item is not available.');
    const contributions = database.sharing.contributions[bucketId] ?? [];
    const mutations = database.sharing.mutations[bucketId] ?? [];
    const result = applyContributionMutation(
      {
        bucketRevision: entry.bucket.revision,
        aggregate: entry.bucket.aggregate,
        contribution: contributions.find((candidate) => candidate.userId === user.id) ?? null,
        appliedMutation: mutations.find((candidate) => candidate.id === mutationId) ?? null,
      },
      {
        mutationId,
        bucketId,
        itemId,
        userId: user.id,
        displayName: user.displayName,
        operation,
        value,
        occurredAt: nowIso(),
      },
    );
    if (!result.alreadyApplied) {
      const nextContributions = contributions.filter((candidate) => candidate.userId !== user.id);
      nextContributions.push(result.contribution);
      database.sharing.contributions[bucketId] = nextContributions;
      database.sharing.mutations[bucketId] = [result.record, ...mutations].slice(0, 500);
      storeBucket(database, entry, {
        ...entry.bucket,
        aggregate: result.aggregate,
        revision: result.bucketRevision,
        updatedAt: nowIso(),
      });
      appendActivity(database, bucketId, user, 'contribution_updated', 'item', itemId, {
        itemName: item.name,
        quantity: String(result.record.resultQuantity),
      });
      writeDatabase(database);
    }
    return structuredClone(result.record);
  }

  async listActivity(user: SessionUser, bucketId: string): Promise<BucketActivityEvent[]> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry || !roleOf(database, entry.bucket, user.id)) throw new Error('You do not have permission for this action.');
    return structuredClone(database.sharing.activity[bucketId] ?? []);
  }

  async repairAggregate(
    user: SessionUser,
    bucketId: string,
  ): Promise<{ bucket: Bucket; drifted: boolean }> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry || entry.bucket.ownerId !== user.id) throw new Error('You do not have permission for this action.');
    const contributions = database.sharing.contributions[bucketId] ?? [];
    const { drifted } = detectAggregateDrift(entry.bucket.aggregate, contributions);
    if (!drifted) return { bucket: structuredClone(entry.bucket), drifted: false };
    const repaired: Bucket = {
      ...entry.bucket,
      aggregate: computeAggregate(contributions),
      revision: entry.bucket.revision + 1,
      updatedAt: nowIso(),
    };
    storeBucket(database, entry, repaired);
    appendActivity(database, bucketId, user, 'aggregate_repaired', 'bucket', bucketId, {});
    writeDatabase(database);
    return { bucket: structuredClone(repaired), drifted: true };
  }

  async placeGroupOrder(user: SessionUser, bucketId: string, notes: string): Promise<Order> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) throw new Error('Bucket was not found.');
    const role = roleOf(database, entry.bucket, user.id);
    if (!role || !['owner', 'editor'].includes(role)) throw new Error('You do not have permission for this action.');
    const lines = buildGroupOrderLines(entry.bucket);
    if (lines.length === 0) throw new Error('Choose at least one item.');
    const contributions = database.sharing.contributions[bucketId] ?? [];
    const order = createOrder(user.id, {
      bucketId,
      bucketTitle: entry.bucket.title,
      currency: entry.bucket.currency,
      lines,
      notes,
      status: 'placed',
      sourceBucketRevision: entry.bucket.revision,
      participants: toOrderParticipants(contributions),
    });
    database.orders[user.id] = [order, ...(database.orders[user.id] ?? [])];
    appendActivity(database, bucketId, user, 'order_placed', 'order', order.id, {
      total: String(order.total),
      currency: order.currency,
    });
    writeDatabase(database);
    return structuredClone(order);
  }
}
