import { nowIso } from '@/lib/date';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
} from '@/packages/firebase';

import type {
  CustomItemInput,
  MemberCustomItemPermissions,
} from '../contracts/group-order-service.interfaces';
import { validatePricingPolicy } from '../helpers/bucket.helper';
import {
  assertBucketMutable,
  beginOrdering,
  completeOrdering,
  freezeBucket,
  unfreezeBucket,
} from '../helpers/bucket-lifecycle.helper';
import { createOrder } from '../helpers/order.helper';
import {
  buildGroupOrderLines,
  toOrderParticipants,
} from '../helpers/sharing.helper';
import type {
  Bucket,
  BucketContribution,
  BucketItem,
  BucketMember,
  BucketPricingPolicy,
  ContributionMutationRecord,
  ContributionOperation,
  Order,
  SessionUser,
} from '../types/domain.types';
import { getFirebaseRuntime } from './firebase-runtime.gateway';
import { FirestoreSharingService } from './firestore-sharing.gateway';
import {
  assertOwner,
  buildReceipt,
  canCreateCustomItem,
  normalizeBucket,
  normalizeCustomItem,
  participantOrder,
  priceToMinor,
} from './group-order-gateway.helper';

const bucketReference = (bucketId: string) =>
  doc(getFirebaseRuntime().firestore, 'buckets', bucketId);

const memberReference = (bucketId: string, userId: string) =>
  doc(getFirebaseRuntime().firestore, 'buckets', bucketId, 'members', userId);

export class FirestoreGroupOrderService extends FirestoreSharingService {
  async freezeBucket(user: SessionUser, bucketId: string): Promise<Bucket> {
    const reference = bucketReference(bucketId);
    return runTransaction(getFirebaseRuntime().firestore, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('Bucket was not found.');
      const bucket = normalizeBucket(snapshot.data() as Bucket);
      assertOwner(bucket, user);
      const saved = freezeBucket(bucket, user.id);
      transaction.set(reference, saved);
      return saved;
    });
  }

  async unfreezeBucket(user: SessionUser, bucketId: string): Promise<Bucket> {
    const reference = bucketReference(bucketId);
    return runTransaction(getFirebaseRuntime().firestore, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('Bucket was not found.');
      const bucket = normalizeBucket(snapshot.data() as Bucket);
      assertOwner(bucket, user);
      const saved = unfreezeBucket(bucket);
      transaction.set(reference, saved);
      return saved;
    });
  }

  async updatePricingPolicy(
    user: SessionUser,
    bucketId: string,
    policy: BucketPricingPolicy,
  ): Promise<Bucket> {
    const reference = bucketReference(bucketId);
    return runTransaction(getFirebaseRuntime().firestore, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('Bucket was not found.');
      const bucket = normalizeBucket(snapshot.data() as Bucket);
      assertOwner(bucket, user);
      assertBucketMutable(bucket);
      const saved: Bucket = {
        ...bucket,
        pricingPolicy: validatePricingPolicy(policy),
        revision: bucket.revision + 1,
        updatedAt: nowIso(),
      };
      transaction.set(reference, saved);
      return saved;
    });
  }

  async setMemberCustomItemPermissions(
    user: SessionUser,
    bucketId: string,
    memberId: string,
    permissions: MemberCustomItemPermissions,
  ): Promise<BucketMember> {
    const bucketSnapshot = await getDoc(bucketReference(bucketId));
    if (!bucketSnapshot.exists()) throw new Error('Bucket was not found.');
    assertOwner(normalizeBucket(bucketSnapshot.data() as Bucket), user);
    const reference = memberReference(bucketId, memberId);
    const memberSnapshot = await getDoc(reference);
    if (!memberSnapshot.exists()) throw new Error('Member was not found.');
    const member = memberSnapshot.data() as BucketMember;
    if (member.role === 'owner') {
      throw new Error('Owner permissions cannot be reduced.');
    }
    const saved = { ...member, ...permissions, updatedAt: nowIso() };
    await setDoc(reference, saved);
    return saved;
  }

  async addCustomItem(
    user: SessionUser,
    bucketId: string,
    input: CustomItemInput,
  ): Promise<BucketItem> {
    const reference = bucketReference(bucketId);
    const firestore = getFirebaseRuntime().firestore;
    return runTransaction(firestore, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('Bucket was not found.');
      const bucket = normalizeBucket(snapshot.data() as Bucket);
      assertBucketMutable(bucket);
      const memberSnapshot =
        bucket.ownerId === user.id
          ? null
          : await transaction.get(memberReference(bucketId, user.id));
      const member = memberSnapshot?.exists()
        ? (memberSnapshot.data() as BucketMember)
        : null;
      const permission = canCreateCustomItem(bucket, user, member);
      const item = normalizeCustomItem(
        bucket,
        user,
        input,
        permission.approved,
        permission.canSetPrice,
      );
      transaction.update(reference, {
        items: [...bucket.items, item],
        revision: bucket.revision + 1,
        updatedAt: nowIso(),
      });
      return item;
    });
  }

  async approveCustomItem(
    user: SessionUser,
    bucketId: string,
    itemId: string,
    unitPrice: number,
  ): Promise<BucketItem> {
    const reference = bucketReference(bucketId);
    return runTransaction(getFirebaseRuntime().firestore, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('Bucket was not found.');
      const bucket = normalizeBucket(snapshot.data() as Bucket);
      assertOwner(bucket, user);
      assertBucketMutable(bucket);
      const index = bucket.items.findIndex((item) => item.id === itemId);
      const item = bucket.items[index];
      if (!item || item.source !== 'custom') {
        throw new Error('Custom item was not found.');
      }
      const approved: BucketItem = {
        ...item,
        unitPrice: priceToMinor(unitPrice) / 100,
        active: true,
        approvalStatus: 'approved',
      };
      const items = [...bucket.items];
      items[index] = approved;
      transaction.update(reference, {
        items,
        revision: bucket.revision + 1,
        updatedAt: nowIso(),
      });
      return approved;
    });
  }

  override async setContribution(
    user: SessionUser,
    bucketId: string,
    itemId: string,
    operation: ContributionOperation,
    value: number,
    mutationId: string,
  ): Promise<ContributionMutationRecord> {
    const snapshot = await getDoc(bucketReference(bucketId));
    if (!snapshot.exists()) throw new Error('Bucket was not found.');
    assertBucketMutable(normalizeBucket(snapshot.data() as Bucket));
    return super.setContribution(user, bucketId, itemId, operation, value, mutationId);
  }

  override async placeGroupOrder(
    user: SessionUser,
    bucketId: string,
    notes: string,
  ): Promise<Order> {
    const firestore = getFirebaseRuntime().firestore;
    const contributionSnapshots = await getDocs(
      collection(firestore, 'buckets', bucketId, 'contributions'),
    );
    const contributionReferences = contributionSnapshots.docs.map(
      (snapshot) => snapshot.ref,
    );

    return runTransaction(firestore, async (transaction) => {
      const bucketRef = bucketReference(bucketId);
      const bucketSnapshot = await transaction.get(bucketRef);
      if (!bucketSnapshot.exists()) throw new Error('Bucket was not found.');
      const bucket = normalizeBucket(bucketSnapshot.data() as Bucket);
      assertOwner(bucket, user);
      const mutationId = `${user.id}_${bucket.revision}`;
      const mutationRef = doc(
        firestore,
        'buckets',
        bucketId,
        'orderMutations',
        mutationId,
      );
      const mutationSnapshot = await transaction.get(mutationRef);
      if (mutationSnapshot.exists()) {
        const mutation = mutationSnapshot.data() as { orderId: string };
        const orderSnapshot = await transaction.get(
          doc(firestore, 'users', user.id, 'orders', mutation.orderId),
        );
        if (orderSnapshot.exists()) return orderSnapshot.data() as Order;
      }

      const contributions: BucketContribution[] = [];
      for (const reference of contributionReferences) {
        const snapshot = await transaction.get(reference);
        if (snapshot.exists()) {
          contributions.push(snapshot.data() as BucketContribution);
        }
      }
      const ordering = beginOrdering(bucket, user.id);
      const receipt = buildReceipt(ordering, contributions, ordering.revision);
      const order = createOrder(user.id, {
        bucketId,
        bucketTitle: ordering.title,
        currency: ordering.currency,
        lines: buildGroupOrderLines(ordering),
        notes,
        status: 'placed',
        sourceBucketRevision: ordering.revision,
        participants: toOrderParticipants(contributions),
        groupReceipt: receipt,
      });
      transaction.set(bucketRef, completeOrdering(ordering));
      transaction.set(doc(firestore, 'users', user.id, 'orders', order.id), order);
      for (const participant of receipt.participantReceipts) {
        if (participant.userId !== user.id) {
          transaction.set(
            doc(firestore, 'users', participant.userId, 'orders', order.id),
            participantOrder(order, participant.userId),
          );
        }
      }
      transaction.set(mutationRef, {
        orderId: order.id,
        ownerId: user.id,
        createdAt: nowIso(),
      });
      return order;
    });
  }
}
