import { randomUUID } from 'node:crypto';

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  calculateGroupOrderReceipt,
  type GroupOrderChargePolicy,
  type GroupOrderReceipt,
  type SupportedCurrency,
} from '../../packages/group-order-engine/src/index.js';

initializeApp();
const firestore = getFirestore();
const REGION = 'europe-west1';
const MAX_ITEMS = 50;

interface BucketItemRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  unitPrice: number;
  active: boolean;
  sortOrder: number;
  createdByUserId?: string;
  createdByName?: string;
  source?: 'catalog' | 'custom';
  approvalStatus?: 'approved' | 'pending' | 'rejected';
}

interface BucketRecord {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  currency: SupportedCurrency;
  revision: number;
  items: BucketItemRecord[];
  aggregate: Record<string, number>;
  orderState?: 'open' | 'frozen' | 'ordering' | 'ordered';
  customItemMode?: 'disabled' | 'proposal' | 'direct';
  pricingPolicy?: GroupOrderChargePolicy;
  frozenAt?: string | null;
  frozenBy?: string | null;
  lastOrderId?: string | null;
  updatedAt: string;
}

interface ContributionRecord {
  userId: string;
  displayName: string;
  quantities: Record<string, number>;
}

interface MemberRecord {
  userId: string;
  displayName: string;
  role: 'owner' | 'editor' | 'contributor' | 'viewer';
  status: 'active' | 'revoked' | 'left';
  canCreateCustomItems?: boolean;
  canSetCustomItemPrice?: boolean;
}

interface OrderLineRecord {
  id: string;
  bucketItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface OrderRecord {
  id: string;
  userId: string;
  bucketId: string;
  bucketTitle: string;
  status: 'placed';
  currency: SupportedCurrency;
  lines: OrderLineRecord[];
  notes: string;
  subtotal: number;
  total: number;
  sourceBucketRevision: number;
  participants: {
    userId: string;
    displayName: string;
    quantities: Record<string, number>;
  }[];
  groupReceipt: GroupOrderReceipt & {
    pricingPolicy: GroupOrderChargePolicy;
    bucketRevision: number;
  };
  createdAt: string;
  updatedAt: string;
  placedAt: string;
  completedAt: null;
  cancelledAt: null;
}

const defaultPricingPolicy = (): GroupOrderChargePolicy => ({
  vatBasisPoints: 0,
  serviceBasisPoints: 0,
  deliveryMinor: 0,
  vatAllocation: 'proportional',
  serviceAllocation: 'proportional',
  deliveryAllocation: 'equal',
});

const requireAuth = (auth: { uid: string } | undefined): string => {
  if (!auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
  return auth.uid;
};

const requiredString = (value: unknown, label: string, maxLength: number): string => {
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
    throw new HttpsError('invalid-argument', `${label} must be a non-negative number.`);
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
  if (typeof email === 'string' && email.includes('@')) return email.split('@')[0] ?? 'User';
  return 'User';
};

const itemPriceMinor = (item: BucketItemRecord): number => {
  const value = Math.round(item.unitPrice * 100);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new HttpsError('failed-precondition', 'An item has an invalid price.');
  }
  return value;
};

const participantOrder = (order: OrderRecord, participantId: string): OrderRecord => {
  const receipt = order.groupReceipt.participantReceipts.find(
    (candidate) => candidate.userId === participantId,
  );
  if (!receipt) {
    throw new HttpsError('internal', 'A participant receipt could not be generated.');
  }

  return {
    ...order,
    userId: participantId,
    lines: receipt.lines.map((line) => ({
      id: randomUUID(),
      bucketItemId: line.itemId,
      name: line.itemName,
      quantity: line.quantity,
      unitPrice: line.unitPriceMinor / 100,
      lineTotal: line.lineTotalMinor / 100,
    })),
    subtotal: receipt.itemSubtotalMinor / 100,
    total: receipt.totalMinor / 100,
    participants: order.participants.filter(
      (participant) => participant.userId === participantId,
    ),
    groupReceipt: {
      ...order.groupReceipt,
      participantReceipts: [receipt],
      items: order.groupReceipt.items
        .map((item) => ({
          ...item,
          orderedBy: item.orderedBy.filter(
            (participant) => participant.userId === participantId,
          ),
        }))
        .filter((item) => item.orderedBy.length > 0),
    },
  };
};

const buildOrder = (
  bucket: BucketRecord,
  contributions: ContributionRecord[],
  ownerId: string,
  notes: string,
  orderId: string,
  timestamp: string,
): OrderRecord => {
  const itemsById = new Map(bucket.items.map((item) => [item.id, item]));
  const participants = contributions
    .map((contribution) => ({
      userId: contribution.userId,
      displayName: contribution.displayName,
      quantities: Object.fromEntries(
        Object.entries(contribution.quantities).filter(([, quantity]) => quantity > 0),
      ),
    }))
    .filter((participant) => Object.keys(participant.quantities).length > 0);
  const receiptParticipants = participants.map((participant) => ({
    userId: participant.userId,
    displayName: participant.displayName,
    items: Object.entries(participant.quantities).map(([itemId, quantity]) => {
      const item = itemsById.get(itemId);
      if (!item || !item.active || item.approvalStatus === 'pending') {
        throw new HttpsError(
          'failed-precondition',
          'A contribution references an unavailable item.',
        );
      }
      return {
        itemId,
        itemName: item.name,
        quantity,
        unitPriceMinor: itemPriceMinor(item),
        createdByUserId: item.createdByUserId ?? bucket.ownerId,
        createdByName: item.createdByName ?? bucket.ownerName,
      };
    }),
  }));
  if (receiptParticipants.length === 0) {
    throw new HttpsError('failed-precondition', 'The bucket has no quantities to order.');
  }

  const pricingPolicy = bucket.pricingPolicy ?? defaultPricingPolicy();
  const receipt = calculateGroupOrderReceipt({
    currency: bucket.currency,
    participants: receiptParticipants,
    policy: pricingPolicy,
  });
  const nextRevision = bucket.revision + 1;
  const lines = bucket.items
    .filter((item) => item.active && (bucket.aggregate[item.id] ?? 0) > 0)
    .map((item) => ({
      id: randomUUID(),
      bucketItemId: item.id,
      name: item.name,
      quantity: bucket.aggregate[item.id] ?? 0,
      unitPrice: item.unitPrice,
      lineTotal: Math.round((bucket.aggregate[item.id] ?? 0) * item.unitPrice * 100) / 100,
    }));

  return {
    id: orderId,
    userId: ownerId,
    bucketId: bucket.id,
    bucketTitle: bucket.title,
    status: 'placed',
    currency: bucket.currency,
    lines,
    notes,
    subtotal: receipt.itemSubtotalMinor / 100,
    total: receipt.grandTotalMinor / 100,
    sourceBucketRevision: nextRevision,
    participants,
    groupReceipt: {
      ...receipt,
      pricingPolicy,
      bucketRevision: nextRevision,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    placedAt: timestamp,
    completedAt: null,
    cancelledAt: null,
  };
};

export const finalizeGroupOrder = onCall({ region: REGION }, async (request) => {
  const ownerId = requireAuth(request.auth);
  const data = callableData(request.data);
  const bucketId = requiredString(data.bucketId, 'Bucket ID', 160);
  const notes = optionalString(data.notes, 500);
  const bucketReference = firestore.collection('buckets').doc(bucketId);
  const orderId = firestore.collection('users').doc(ownerId).collection('orders').doc().id;

  try {
    return await firestore.runTransaction(async (transaction) => {
      const bucketSnapshot = await transaction.get(bucketReference);
      if (!bucketSnapshot.exists) {
        throw new HttpsError('not-found', 'Bucket was not found.');
      }
      const bucket = bucketSnapshot.data() as BucketRecord;
      if (bucket.ownerId !== ownerId) {
        throw new HttpsError('permission-denied', 'Only the bucket owner may place this order.');
      }
      const state = bucket.orderState ?? 'open';
      if (state === 'ordered' && bucket.lastOrderId) {
        const existing = await transaction.get(
          firestore.collection('users').doc(ownerId).collection('orders').doc(bucket.lastOrderId),
        );
        if (existing.exists) return existing.data() as OrderRecord;
      }
      if (state !== 'open' && state !== 'frozen') {
        throw new HttpsError('failed-precondition', `A bucket in ${state} state cannot be ordered.`);
      }

      const contributionSnapshot = await transaction.get(
        bucketReference.collection('contributions'),
      );
      const contributions = contributionSnapshot.docs.map(
        (snapshot) => snapshot.data() as ContributionRecord,
      );
      const timestamp = new Date().toISOString();
      const order = buildOrder(bucket, contributions, ownerId, notes, orderId, timestamp);

      transaction.update(bucketReference, {
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
        if (participant.userId !== ownerId) {
          transaction.set(
            firestore
              .collection('users')
              .doc(participant.userId)
              .collection('orders')
              .doc(order.id),
            participantOrder(order, participant.userId),
          );
        }
      }
      transaction.set(bucketReference.collection('orderMutations').doc(order.id), {
        orderId: order.id,
        ownerId,
        createdAt: timestamp,
      });
      return order;
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('Group-order finalization failed.', { bucketId, ownerId, error });
    throw new HttpsError('internal', 'The group order could not be finalized.');
  }
});

export const addCustomBucketItem = onCall({ region: REGION }, async (request) => {
  const userId = requireAuth(request.auth);
  const data = callableData(request.data);
  const bucketId = requiredString(data.bucketId, 'Bucket ID', 160);
  const name = requiredString(data.name, 'Item name', 120);
  const description = optionalString(data.description, 500);
  const category = optionalString(data.category, 80);
  const requestedPrice = nonNegativeMoney(data.unitPrice ?? 0, 'Item price');
  const displayName = actorName(request.auth?.token ?? {});
  const bucketReference = firestore.collection('buckets').doc(bucketId);

  return firestore.runTransaction(async (transaction) => {
    const bucketSnapshot = await transaction.get(bucketReference);
    if (!bucketSnapshot.exists) throw new HttpsError('not-found', 'Bucket was not found.');
    const bucket = bucketSnapshot.data() as BucketRecord;
    if ((bucket.orderState ?? 'open') !== 'open') {
      throw new HttpsError('failed-precondition', 'The bucket is frozen.');
    }
    if (bucket.items.length >= MAX_ITEMS) {
      throw new HttpsError('resource-exhausted', 'The bucket has reached its item limit.');
    }

    let approved = true;
    let canSetPrice = true;
    if (bucket.ownerId !== userId) {
      const memberSnapshot = await transaction.get(
        bucketReference.collection('members').doc(userId),
      );
      if (!memberSnapshot.exists) {
        throw new HttpsError('permission-denied', 'Bucket membership is required.');
      }
      const member = memberSnapshot.data() as MemberRecord;
      const canContribute =
        member.status === 'active' &&
        ['owner', 'editor', 'contributor'].includes(member.role);
      if (!canContribute || member.canCreateCustomItems !== true) {
        throw new HttpsError('permission-denied', 'Custom-item permission is required.');
      }
      if ((bucket.customItemMode ?? 'proposal') === 'disabled') {
        throw new HttpsError('failed-precondition', 'Custom items are disabled.');
      }
      approved = bucket.customItemMode === 'direct';
      canSetPrice = member.canSetCustomItemPrice === true;
    }

    const item: BucketItemRecord = {
      id: randomUUID(),
      name,
      description,
      category,
      unitPrice: canSetPrice ? requestedPrice : 0,
      active: approved,
      sortOrder: bucket.items.length,
      createdByUserId: userId,
      createdByName: displayName,
      source: 'custom',
      approvalStatus: approved ? 'approved' : 'pending',
    };
    transaction.update(bucketReference, {
      items: [...bucket.items, item],
      revision: bucket.revision + 1,
      updatedAt: new Date().toISOString(),
    });
    return item;
  });
});

export const approveCustomBucketItem = onCall({ region: REGION }, async (request) => {
  const ownerId = requireAuth(request.auth);
  const data = callableData(request.data);
  const bucketId = requiredString(data.bucketId, 'Bucket ID', 160);
  const itemId = requiredString(data.itemId, 'Item ID', 160);
  const unitPrice = nonNegativeMoney(data.unitPrice, 'Item price');
  const bucketReference = firestore.collection('buckets').doc(bucketId);

  return firestore.runTransaction(async (transaction) => {
    const bucketSnapshot = await transaction.get(bucketReference);
    if (!bucketSnapshot.exists) throw new HttpsError('not-found', 'Bucket was not found.');
    const bucket = bucketSnapshot.data() as BucketRecord;
    if (bucket.ownerId !== ownerId) {
      throw new HttpsError('permission-denied', 'Only the bucket owner may approve items.');
    }
    if ((bucket.orderState ?? 'open') !== 'open') {
      throw new HttpsError('failed-precondition', 'The bucket is frozen.');
    }
    const itemIndex = bucket.items.findIndex((item) => item.id === itemId);
    const current = bucket.items[itemIndex];
    if (!current || current.source !== 'custom') {
      throw new HttpsError('not-found', 'Custom item was not found.');
    }
    const approved: BucketItemRecord = {
      ...current,
      unitPrice,
      active: true,
      approvalStatus: 'approved',
    };
    const items = [...bucket.items];
    items[itemIndex] = approved;
    transaction.update(bucketReference, {
      items,
      revision: bucket.revision + 1,
      updatedAt: new Date().toISOString(),
    });
    return approved;
  });
});
