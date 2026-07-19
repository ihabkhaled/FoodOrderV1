import {
  collection,
  deleteDoc,
  doc,
  type Firestore,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  writeBatch,
} from '@/packages/firebase';
import { nowIso } from '@/shared/helpers';

import type {
  SharedBucketView,
  SharingService,
} from '../contracts/sharing-service.interfaces';
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
  isInviteUsable,
  MAX_BUCKET_MEMBERS,
  memberCan,
  parseJoinCode,
  toOrderParticipants,
} from '../helpers/sharing.helper';
import type {
  Bucket,
  BucketActivityEvent,
  BucketContribution,
  BucketInvite,
  BucketMember,
  BucketMembershipRef,
  BucketRole,
  ContributionMutationRecord,
  ContributionOperation,
  Order,
  SessionUser,
} from '../types/domain.types';
import {
  activityEvent,
  activityRef,
  bucketRef,
  contributionRef,
  getFirebaseRuntime,
  inviteRef,
  memberRef,
  membershipRef,
  mutationRef,
  ownerMemberDoc,
  PERMISSION_ERROR,
} from './firebase-runtime.gateway';

interface LegacyBucketMember extends BucketMember {
  email?: string;
  inviteId?: string;
}

const sanitizeBucketMember = (member: LegacyBucketMember): BucketMember => ({
  userId: member.userId,
  displayName: member.displayName,
  role: member.role,
  status: member.status,
  ...(member.canCreateCustomItems === undefined
    ? {}
    : { canCreateCustomItems: member.canCreateCustomItems }),
  ...(member.canSetCustomItemPrice === undefined
    ? {}
    : { canSetCustomItemPrice: member.canSetCustomItemPrice }),
  invitedBy: member.invitedBy,
  joinedAt: member.joinedAt,
  updatedAt: member.updatedAt,
});

export class FirestoreSharingService implements SharingService {
  private get firestore(): Firestore {
    return getFirebaseRuntime().firestore;
  }

  async listSharedWithMe(user: SessionUser): Promise<Bucket[]> {
    const memberships = await getDocs(
      collection(this.firestore, 'users', user.id, 'bucketMemberships'),
    );
    const buckets: Bucket[] = [];
    for (const membership of memberships.docs) {
      const data = membership.data() as BucketMembershipRef;
      if (data.role === 'owner') continue;
      const snapshot = await getDoc(bucketRef(this.firestore, data.bucketId));
      if (snapshot.exists()) {
        buckets.push(snapshot.data() as Bucket);
      } else {
        await deleteDoc(membership.ref);
      }
    }
    return buckets.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getSharedBucketView(
    user: SessionUser,
    bucketId: string,
  ): Promise<SharedBucketView | null> {
    const bucketSnapshot = await getDoc(bucketRef(this.firestore, bucketId));
    if (!bucketSnapshot.exists()) return null;
    const bucket = bucketSnapshot.data() as Bucket;
    const [membersSnapshot, contributionsSnapshot] = await Promise.all([
      getDocs(collection(this.firestore, 'buckets', bucketId, 'members')),
      getDocs(collection(this.firestore, 'buckets', bucketId, 'contributions')),
    ]);
    const members = membersSnapshot.docs
      .map((item) => sanitizeBucketMember(item.data() as LegacyBucketMember))
      .filter((member) => member.status === 'active');
    const me = members.find((member) => member.userId === user.id);
    const myRole: BucketRole | null =
      bucket.ownerId === user.id ? 'owner' : (me?.role ?? null);
    if (!myRole) return null;
    return {
      bucket,
      members,
      contributions: contributionsSnapshot.docs.map(
        (item) => item.data() as BucketContribution,
      ),
      myRole,
    };
  }

  async enableSharing(user: SessionUser, bucketId: string): Promise<Bucket> {
    return runTransaction(this.firestore, async (transaction) => {
      const reference = bucketRef(this.firestore, bucketId);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('Bucket was not found.');
      const bucket = snapshot.data() as Bucket;
      if (bucket.ownerId !== user.id) throw new Error(PERMISSION_ERROR);
      if (bucket.visibility === 'shared') return bucket;
      const saved: Bucket = {
        ...bucket,
        visibility: 'shared',
        revision: bucket.revision + 1,
        updatedAt: nowIso(),
      };
      transaction.set(reference, saved);
      transaction.set(memberRef(this.firestore, bucketId, user.id), ownerMemberDoc(user));
      const event = activityEvent(bucketId, user, 'bucket_shared', 'bucket', bucketId, {
        title: saved.title,
      });
      transaction.set(activityRef(this.firestore, bucketId, event.id), event);
      return saved;
    });
  }

  async createInvite(
    user: SessionUser,
    bucketId: string,
    role: Exclude<BucketRole, 'owner'>,
  ): Promise<{ invite: BucketInvite; joinCode: string }> {
    assertAssignableRole(role);
    const bucketSnapshot = await getDoc(bucketRef(this.firestore, bucketId));
    if (!bucketSnapshot.exists()) throw new Error('Bucket was not found.');
    const bucket = bucketSnapshot.data() as Bucket;
    if (bucket.ownerId !== user.id) throw new Error(PERMISSION_ERROR);
    if (bucket.visibility !== 'shared') {
      throw new Error('Enable sharing before inviting members.');
    }
    const token = generateInviteToken();
    const tokenHash = await hashInviteToken(token);
    const createdAt = nowIso();
    const invite: BucketInvite = {
      id: tokenHash,
      bucketId,
      bucketTitle: bucket.title,
      ownerName: bucket.ownerName,
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
    const batch = writeBatch(this.firestore);
    batch.set(inviteRef(this.firestore, bucketId, tokenHash), invite);
    const event = activityEvent(bucketId, user, 'invite_created', 'invite', tokenHash, {
      role,
    });
    batch.set(activityRef(this.firestore, bucketId, event.id), event);
    await batch.commit();
    return { invite, joinCode: buildJoinCode(bucketId, token) };
  }

  async listInvites(
    _user: SessionUser,
    bucketId: string,
  ): Promise<BucketInvite[]> {
    const snapshot = await getDocs(
      collection(this.firestore, 'buckets', bucketId, 'invites'),
    );
    return snapshot.docs
      .map((item) => item.data() as BucketInvite)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async revokeInvite(
    user: SessionUser,
    bucketId: string,
    inviteId: string,
  ): Promise<void> {
    const batch = writeBatch(this.firestore);
    batch.set(
      inviteRef(this.firestore, bucketId, inviteId),
      { status: 'revoked', revokedAt: nowIso() },
      { merge: true },
    );
    const event = activityEvent(bucketId, user, 'invite_revoked', 'invite', inviteId);
    batch.set(activityRef(this.firestore, bucketId, event.id), event);
    await batch.commit();
  }

  async previewJoinCode(code: string): Promise<BucketInvite> {
    const parsed = parseJoinCode(code);
    if (!parsed) throw new Error('This join code is not valid.');
    const tokenHash = await hashInviteToken(parsed.token);
    const snapshot = await getDoc(
      inviteRef(this.firestore, parsed.bucketId, tokenHash),
    );
    if (!snapshot.exists()) throw new Error('This join code is not valid.');
    const invite = snapshot.data() as BucketInvite;
    if (!isInviteUsable(invite)) {
      throw new Error('This invite has expired or was already used.');
    }
    return invite;
  }

  async acceptJoinCode(user: SessionUser, code: string): Promise<Bucket> {
    const parsed = parseJoinCode(code);
    if (!parsed) throw new Error('This join code is not valid.');
    const tokenHash = await hashInviteToken(parsed.token);
    const memberSnapshots = await getDocs(
      collection(this.firestore, 'buckets', parsed.bucketId, 'members'),
    );
    const activeCount = memberSnapshots.docs.filter(
      (item) => (item.data() as LegacyBucketMember).status === 'active',
    ).length;
    if (activeCount >= MAX_BUCKET_MEMBERS) {
      throw new Error(`A bucket supports up to ${MAX_BUCKET_MEMBERS} members.`);
    }

    const invite = await runTransaction(this.firestore, async (transaction) => {
      const inviteReference = inviteRef(this.firestore, parsed.bucketId, tokenHash);
      const inviteSnapshot = await transaction.get(inviteReference);
      if (!inviteSnapshot.exists()) throw new Error('This join code is not valid.');
      const pending = inviteSnapshot.data() as BucketInvite;
      if (!isInviteUsable(pending)) {
        throw new Error('This invite has expired or was already used.');
      }
      const memberReference = memberRef(this.firestore, parsed.bucketId, user.id);
      const memberSnapshot = await transaction.get(memberReference);
      const existing = memberSnapshot.exists()
        ? sanitizeBucketMember(memberSnapshot.data() as LegacyBucketMember)
        : null;
      if (existing?.status === 'active') {
        throw new Error('You are already a member of this bucket.');
      }
      const at = nowIso();
      const member: BucketMember & { inviteId: string } = {
        userId: user.id,
        displayName: user.displayName,
        role: pending.role,
        status: 'active',
        invitedBy: pending.createdBy,
        joinedAt: existing?.joinedAt ?? at,
        updatedAt: at,
        inviteId: tokenHash,
      };
      transaction.set(memberReference, member);
      transaction.set(
        inviteReference,
        { status: 'accepted', acceptedBy: user.id, acceptedAt: at },
        { merge: true },
      );
      transaction.set(membershipRef(this.firestore, user.id, parsed.bucketId), {
        bucketId: parsed.bucketId,
        role: pending.role,
        bucketTitle: pending.bucketTitle,
        ownerName: pending.ownerName,
        joinedAt: at,
      });
      const event = activityEvent(
        parsed.bucketId,
        user,
        'member_joined',
        'member',
        user.id,
        { role: pending.role },
      );
      transaction.set(activityRef(this.firestore, parsed.bucketId, event.id), event);
      return pending;
    });

    const bucketSnapshot = await getDoc(bucketRef(this.firestore, invite.bucketId));
    if (!bucketSnapshot.exists()) throw new Error('Bucket was not found.');
    return bucketSnapshot.data() as Bucket;
  }

  async changeMemberRole(
    user: SessionUser,
    bucketId: string,
    memberId: string,
    role: Exclude<BucketRole, 'owner'>,
  ): Promise<BucketMember> {
    assertAssignableRole(role);
    const reference = memberRef(this.firestore, bucketId, memberId);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) throw new Error('Member was not found.');
    const member = sanitizeBucketMember(snapshot.data() as LegacyBucketMember);
    if (member.role === 'owner') {
      throw new Error('Ownership cannot be assigned through invites or role changes.');
    }
    const saved: BucketMember = { ...member, role, updatedAt: nowIso() };
    const batch = writeBatch(this.firestore);
    batch.set(reference, saved);
    const event = activityEvent(bucketId, user, 'member_role_changed', 'member', memberId, {
      role,
      memberName: member.displayName,
    });
    batch.set(activityRef(this.firestore, bucketId, event.id), event);
    await batch.commit();
    return saved;
  }

  async revokeMember(
    user: SessionUser,
    bucketId: string,
    memberId: string,
  ): Promise<void> {
    const reference = memberRef(this.firestore, bucketId, memberId);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) return;
    const member = sanitizeBucketMember(snapshot.data() as LegacyBucketMember);
    if (member.role === 'owner') {
      throw new Error('The owner cannot be removed. Delete the bucket instead.');
    }
    const batch = writeBatch(this.firestore);
    batch.set(reference, { status: 'revoked', updatedAt: nowIso() }, { merge: true });
    const event = activityEvent(bucketId, user, 'member_revoked', 'member', memberId, {
      memberName: member.displayName,
    });
    batch.set(activityRef(this.firestore, bucketId, event.id), event);
    await batch.commit();
  }

  async leaveBucket(user: SessionUser, bucketId: string): Promise<void> {
    const reference = memberRef(this.firestore, bucketId, user.id);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) return;
    const member = sanitizeBucketMember(snapshot.data() as LegacyBucketMember);
    if (member.role === 'owner') {
      throw new Error('The owner cannot leave. Delete the bucket instead.');
    }
    const batch = writeBatch(this.firestore);
    batch.set(reference, { status: 'left', updatedAt: nowIso() }, { merge: true });
    batch.delete(membershipRef(this.firestore, user.id, bucketId));
    const event = activityEvent(bucketId, user, 'member_left', 'member', user.id);
    batch.set(activityRef(this.firestore, bucketId, event.id), event);
    await batch.commit();
  }

  async setContribution(
    user: SessionUser,
    bucketId: string,
    itemId: string,
    operation: ContributionOperation,
    value: number,
    mutationId: string,
  ): Promise<ContributionMutationRecord> {
    return runTransaction(this.firestore, async (transaction) => {
      const mutationReference = mutationRef(this.firestore, bucketId, mutationId);
      const mutationSnapshot = await transaction.get(mutationReference);
      if (mutationSnapshot.exists()) {
        return mutationSnapshot.data() as ContributionMutationRecord;
      }
      const bucketReference = bucketRef(this.firestore, bucketId);
      const bucketSnapshot = await transaction.get(bucketReference);
      if (!bucketSnapshot.exists()) throw new Error('Bucket was not found.');
      const bucket = bucketSnapshot.data() as Bucket;
      const item = bucket.items.find((candidate) => candidate.id === itemId);
      if (!item?.active) throw new Error('This item is not available.');
      if (bucket.ownerId !== user.id) {
        const memberSnapshot = await transaction.get(
          memberRef(this.firestore, bucketId, user.id),
        );
        const member = memberSnapshot.exists()
          ? sanitizeBucketMember(memberSnapshot.data() as LegacyBucketMember)
          : null;
        if (!memberCan(member, 'contribute')) throw new Error(PERMISSION_ERROR);
      }
      const contributionReference = contributionRef(this.firestore, bucketId, user.id);
      const contributionSnapshot = await transaction.get(contributionReference);
      const result = applyContributionMutation(
        {
          bucketRevision: bucket.revision,
          aggregate: bucket.aggregate,
          contribution: contributionSnapshot.exists()
            ? (contributionSnapshot.data() as BucketContribution)
            : null,
          appliedMutation: null,
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
      transaction.set(contributionReference, result.contribution);
      transaction.update(bucketReference, {
        aggregate: result.aggregate,
        revision: result.bucketRevision,
        updatedAt: nowIso(),
      });
      transaction.set(mutationReference, result.record);
      const event = activityEvent(
        bucketId,
        user,
        'contribution_updated',
        'item',
        itemId,
        {
          itemName: item.name,
          quantity: String(result.record.resultQuantity),
        },
      );
      transaction.set(activityRef(this.firestore, bucketId, event.id), event);
      return result.record;
    });
  }

  async listActivity(
    _user: SessionUser,
    bucketId: string,
  ): Promise<BucketActivityEvent[]> {
    const snapshot = await getDocs(
      query(
        collection(this.firestore, 'buckets', bucketId, 'activity'),
        orderBy('createdAt', 'desc'),
        limit(50),
      ),
    );
    return snapshot.docs.map((item) => item.data() as BucketActivityEvent);
  }

  async repairAggregate(
    user: SessionUser,
    bucketId: string,
  ): Promise<{ bucket: Bucket; drifted: boolean }> {
    const contributionsSnapshot = await getDocs(
      collection(this.firestore, 'buckets', bucketId, 'contributions'),
    );
    const contributionReferences = contributionsSnapshot.docs.map((item) => item.ref);
    return runTransaction(this.firestore, async (transaction) => {
      const reference = bucketRef(this.firestore, bucketId);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('Bucket was not found.');
      const bucket = snapshot.data() as Bucket;
      if (bucket.ownerId !== user.id) throw new Error(PERMISSION_ERROR);
      const contributions: BucketContribution[] = [];
      for (const contributionReference of contributionReferences) {
        const contributionSnapshot = await transaction.get(contributionReference);
        if (contributionSnapshot.exists()) {
          contributions.push(contributionSnapshot.data() as BucketContribution);
        }
      }
      const { drifted } = detectAggregateDrift(bucket.aggregate, contributions);
      if (!drifted) return { bucket, drifted: false };
      const repaired: Bucket = {
        ...bucket,
        aggregate: computeAggregate(contributions),
        revision: bucket.revision + 1,
        updatedAt: nowIso(),
      };
      transaction.set(reference, repaired);
      const event = activityEvent(
        bucketId,
        user,
        'aggregate_repaired',
        'bucket',
        bucketId,
      );
      transaction.set(activityRef(this.firestore, bucketId, event.id), event);
      return { bucket: repaired, drifted: true };
    });
  }

  async placeGroupOrder(
    user: SessionUser,
    bucketId: string,
    notes: string,
  ): Promise<Order> {
    const bucketSnapshot = await getDoc(bucketRef(this.firestore, bucketId));
    if (!bucketSnapshot.exists()) throw new Error('Bucket was not found.');
    const bucket = bucketSnapshot.data() as Bucket;
    if (bucket.ownerId !== user.id) {
      const memberSnapshot = await getDoc(
        memberRef(this.firestore, bucketId, user.id),
      );
      const member = memberSnapshot.exists()
        ? sanitizeBucketMember(memberSnapshot.data() as LegacyBucketMember)
        : null;
      if (!memberCan(member, 'placeGroupOrder')) throw new Error(PERMISSION_ERROR);
    }
    const lines = buildGroupOrderLines(bucket);
    if (lines.length === 0) throw new Error('Choose at least one item.');
    const contributionsSnapshot = await getDocs(
      collection(this.firestore, 'buckets', bucketId, 'contributions'),
    );
    const contributions = contributionsSnapshot.docs.map(
      (item) => item.data() as BucketContribution,
    );
    const order = createOrder(user.id, {
      bucketId,
      bucketTitle: bucket.title,
      currency: bucket.currency,
      lines,
      notes,
      status: 'placed',
      sourceBucketRevision: bucket.revision,
      participants: toOrderParticipants(contributions),
    });
    const batch = writeBatch(this.firestore);
    batch.set(doc(this.firestore, 'users', user.id, 'orders', order.id), order);
    const event = activityEvent(bucketId, user, 'order_placed', 'order', order.id, {
      total: String(order.total),
      currency: order.currency,
    });
    batch.set(activityRef(this.firestore, bucketId, event.id), event);
    await batch.commit();
    return order;
  }
}
