import { randomUUID } from 'node:crypto';

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  effectiveMemberCustomItemPermissions,
  type MemberPermissionRecord,
} from './memberPermissions.js';
import {
  buildOrderSnapshot,
  type BucketItemRecord,
  type BucketRecord,
  type ContributionRecord,
  type OrderRecord,
  OrderValidationError,
  participantOrder,
} from './orderDomain.js';

initializeApp();
const firestore = getFirestore();
firestore.settings({ ignoreUndefinedProperties: true });

const REGION = 'europe-west1';
const MAX_ITEMS = 50;

interface MemberRecord extends MemberPermissionRecord {
  userId: string;
  displayName: string;
  status: 'active' | 'revoked' | 'left';
}

interface CustomItemInput {
  name: string;
  description: string;
  category: string;
  unitPrice: number;
}

const requireAuth = (auth: { uid: string } | undefined): string => {
  if (!auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
  return auth.uid;
};

const requiredString = (
  value: unknown,
  label: string,
  maxLength: number,
): string => {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${label} must be a string.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new HttpsError(
      'invalid-argument',
      `${label} must contain between 1 and ${maxLength} characters.`,
    );
  }
  return normalized;
};

const optionalString = (value: unknown, maxLength: number): string => {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', 'The supplied text value is invalid.');
  }
  return value.trim().slice(0, maxLength);
};

const nonNegativeMoney = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new HttpsError(
      'invalid-argument',
      `${label} must be a non-negative number.`,
    );
  }
  return Math.round(value * 100) / 100;
};

const callableData = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};

const actorName = (token: Record<string, unknown>): string => {
  const name = token.name;
  if (typeof name === 'string' && name.trim()) return name.trim();
  const email = token.email;
  if (typeof email === 'string' && email.includes('@')) {
    return email.split('@')[0] ?? 'User';
  }
  return 'User';
};

const nextRevision = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1
    ? value + 1
    : 2;

const safeError = (error: unknown): { message: string; stack?: string } => {
  if (!(error instanceof Error)) return { message: String(error) };
  return error.stack
    ? { message: error.message, stack: error.stack }
    : { message: error.message };
};

export const finalizeGroupOrder = onCall({ region: REGION }, async (request) => {
  const ownerId = requireAuth(request.auth);
  const data = callableData(request.data);
  const bucketId = requiredString(data.bucketId, 'Bucket ID', 160);
  const notes = optionalString(data.notes, 500);
  const bucketReference = firestore.collection('buckets').doc(bucketId);
  const orderId = firestore
    .collection('users')
    .doc(ownerId)
    .collection('orders')
    .doc().id;

  try {
    return await firestore.runTransaction(async (transaction) => {
      const bucketSnapshot = await transaction.get(bucketReference);
      if (!bucketSnapshot.exists) {
        throw new HttpsError('not-found', 'Bucket was not found.');
      }

      const bucket = bucketSnapshot.data() as BucketRecord;
      if (bucket.ownerId !== ownerId) {
        throw new HttpsError(
          'permission-denied',
          'Only the bucket owner may place this order.',
        );
      }

      const state = bucket.orderState ?? 'open';
      if (state === 'ordered' && bucket.lastOrderId) {
        const existing = await transaction.get(
          firestore
            .collection('users')
            .doc(ownerId)
            .collection('orders')
            .doc(bucket.lastOrderId),
        );
        if (existing.exists) return existing.data() as OrderRecord;
      }
      if (state !== 'open' && state !== 'frozen') {
        throw new HttpsError(
          'failed-precondition',
          `A bucket in ${state} state cannot be ordered.`,
        );
      }

      const contributionSnapshot = await transaction.get(
        bucketReference.collection('contributions'),
      );
      const contributions = contributionSnapshot.docs.map(
        (snapshot) => snapshot.data() as ContributionRecord,
      );
      const timestamp = new Date().toISOString();
      const { order, aggregate } = buildOrderSnapshot(
        bucket,
        contributions,
        ownerId,
        notes,
        orderId,
        timestamp,
      );

      transaction.update(bucketReference, {
        aggregate,
        orderState: 'ordered',
        frozenAt: bucket.frozenAt ?? timestamp,
        frozenBy: bucket.frozenBy ?? ownerId,
        lastOrderId: order.id,
        revision: order.sourceBucketRevision,
        updatedAt: timestamp,
      });
      transaction.set(
        firestore.collection('users').doc(ownerId).collection('orders').doc(order.id),
        order,
      );

      for (const participant of order.groupReceipt.participantReceipts) {
        if (participant.userId === ownerId) continue;
        transaction.set(
          firestore
            .collection('users')
            .doc(participant.userId)
            .collection('orders')
            .doc(order.id),
          participantOrder(order, participant.userId),
        );
      }

      transaction.set(
        bucketReference.collection('orderMutations').doc(order.id),
        {
          orderId: order.id,
          ownerId,
          createdAt: timestamp,
        },
      );
      return order;
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error instanceof OrderValidationError) {
      throw new HttpsError('failed-precondition', error.message);
    }
    logger.error('Group-order finalization failed.', {
      bucketId,
      ownerId,
      error: safeError(error),
    });
    throw new HttpsError('internal', 'The group order could not be finalized.');
  }
});

export const addCustomBucketItem = onCall(
  { region: REGION },
  async (request) => {
    const userId = requireAuth(request.auth);
    const data = callableData(request.data);
    const bucketId = requiredString(data.bucketId, 'Bucket ID', 160);
    const input: CustomItemInput = {
      name: requiredString(data.name, 'Item name', 120),
      description: optionalString(data.description, 500),
      category: optionalString(data.category, 80),
      unitPrice: nonNegativeMoney(data.unitPrice ?? 0, 'Item price'),
    };
    const displayName = actorName(request.auth?.token ?? {});
    const bucketReference = firestore.collection('buckets').doc(bucketId);

    return firestore.runTransaction(async (transaction) => {
      const bucketSnapshot = await transaction.get(bucketReference);
      if (!bucketSnapshot.exists) {
        throw new HttpsError('not-found', 'Bucket was not found.');
      }
      const bucket = bucketSnapshot.data() as BucketRecord;
      const items = bucket.items ?? [];
      if ((bucket.orderState ?? 'open') !== 'open') {
        throw new HttpsError('failed-precondition', 'The bucket is frozen.');
      }
      if (items.length >= MAX_ITEMS) {
        throw new HttpsError(
          'resource-exhausted',
          'The bucket has reached its item limit.',
        );
      }

      let approved = true;
      let canSetPrice = true;
      if (bucket.ownerId !== userId) {
        const memberSnapshot = await transaction.get(
          bucketReference.collection('members').doc(userId),
        );
        if (!memberSnapshot.exists) {
          throw new HttpsError(
            'permission-denied',
            'Bucket membership is required.',
          );
        }

        const member = memberSnapshot.data() as MemberRecord;
        const canContribute =
          member.status === 'active' &&
          ['owner', 'editor', 'contributor'].includes(member.role);
        const permissions = effectiveMemberCustomItemPermissions(member);
        if (!canContribute || !permissions.canCreateCustomItems) {
          throw new HttpsError(
            'permission-denied',
            'Custom-item permission is required.',
          );
        }
        if ((bucket.customItemMode ?? 'proposal') === 'disabled') {
          throw new HttpsError(
            'failed-precondition',
            'Custom items are disabled.',
          );
        }
        approved = bucket.customItemMode === 'direct';
        canSetPrice = permissions.canSetCustomItemPrice;
      }

      const item: BucketItemRecord = {
        id: randomUUID(),
        name: input.name,
        description: input.description,
        category: input.category,
        unitPrice: canSetPrice ? input.unitPrice : 0,
        active: approved,
        sortOrder: items.length,
        createdByUserId: userId,
        createdByName: displayName,
        source: 'custom',
        approvalStatus: approved ? 'approved' : 'pending',
      };
      transaction.update(bucketReference, {
        items: [...items, item],
        revision: nextRevision(bucket.revision),
        updatedAt: new Date().toISOString(),
      });
      return item;
    });
  },
);

export const approveCustomBucketItem = onCall(
  { region: REGION },
  async (request) => {
    const ownerId = requireAuth(request.auth);
    const data = callableData(request.data);
    const bucketId = requiredString(data.bucketId, 'Bucket ID', 160);
    const itemId = requiredString(data.itemId, 'Item ID', 160);
    const unitPrice = nonNegativeMoney(data.unitPrice, 'Item price');
    const bucketReference = firestore.collection('buckets').doc(bucketId);

    return firestore.runTransaction(async (transaction) => {
      const bucketSnapshot = await transaction.get(bucketReference);
      if (!bucketSnapshot.exists) {
        throw new HttpsError('not-found', 'Bucket was not found.');
      }
      const bucket = bucketSnapshot.data() as BucketRecord;
      if (bucket.ownerId !== ownerId) {
        throw new HttpsError(
          'permission-denied',
          'Only the bucket owner may approve items.',
        );
      }
      if ((bucket.orderState ?? 'open') !== 'open') {
        throw new HttpsError('failed-precondition', 'The bucket is frozen.');
      }

      const items = bucket.items ?? [];
      const itemIndex = items.findIndex((item) => item.id === itemId);
      const current = items[itemIndex];
      if (!current || current.source !== 'custom') {
        throw new HttpsError('not-found', 'Custom item was not found.');
      }

      const approved: BucketItemRecord = {
        ...current,
        unitPrice,
        active: true,
        approvalStatus: 'approved',
      };
      const nextItems = [...items];
      nextItems[itemIndex] = approved;
      transaction.update(bucketReference, {
        items: nextItems,
        revision: nextRevision(bucket.revision),
        updatedAt: new Date().toISOString(),
      });
      return approved;
    });
  },
);
