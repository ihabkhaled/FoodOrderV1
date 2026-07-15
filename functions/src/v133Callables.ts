import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import {
  type CallableRequest,
  HttpsError,
  onCall,
} from 'firebase-functions/v2/https';

import {
  assertGroupOrderDocument,
  buildGroupOrderTransitionPatch,
  type GroupOrderDocument,
  type GroupOrderStatus,
  repeatGroupOrderDocument,
} from './orderLifecycle.js';

if (getApps().length === 0) initializeApp();

const firestore = getFirestore();
const REGION = 'europe-west1';

interface Actor {
  userId: string;
}

interface BucketRecord {
  ownerId?: string;
}

interface MemberRecord {
  role?: string;
  status?: string;
}

interface ManagedOrderContext {
  actorOrder: GroupOrderDocument;
  canonicalOrder: GroupOrderDocument;
  ownerId: string;
}

const callableData = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};

const requireActor = (request: CallableRequest<unknown>): Actor => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }
  return { userId: request.auth.uid };
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

const requiredStatus = (value: unknown): GroupOrderStatus => {
  if (
    value !== 'placed' &&
    value !== 'completed' &&
    value !== 'cancelled'
  ) {
    throw new HttpsError('invalid-argument', 'The order status is invalid.');
  }
  return value;
};

const safeError = (error: unknown): { message: string; stack?: string } => {
  if (!(error instanceof Error)) return { message: String(error) };
  return error.stack
    ? { message: error.message, stack: error.stack }
    : { message: error.message };
};

const throwCallableError = (
  operation: string,
  error: unknown,
  context: Record<string, unknown>,
): never => {
  if (error instanceof HttpsError) throw error;
  logger.error(`${operation} failed.`, {
    ...context,
    error: safeError(error),
  });
  throw new HttpsError(
    error instanceof Error && error.message.startsWith('Order cannot move')
      ? 'failed-precondition'
      : 'internal',
    error instanceof Error && error.message.startsWith('Order cannot move')
      ? error.message
      : 'The cloud action could not be completed. Please try again.',
  );
};

const assertManagerAccess = async (
  transaction: FirebaseFirestore.Transaction,
  bucketReference: FirebaseFirestore.DocumentReference,
  ownerId: string,
  actorId: string,
): Promise<void> => {
  if (actorId === ownerId) return;
  const memberSnapshot = await transaction.get(
    bucketReference.collection('members').doc(actorId),
  );
  const member = memberSnapshot.exists
    ? (memberSnapshot.data() as MemberRecord)
    : null;
  if (member?.status !== 'active' || member.role !== 'editor') {
    throw new HttpsError(
      'permission-denied',
      'Only the bucket owner or an active editor may change this group order.',
    );
  }
};

const loadManagedOrder = async (
  transaction: FirebaseFirestore.Transaction,
  actorId: string,
  orderId: string,
): Promise<ManagedOrderContext> => {
  const actorReference = firestore
    .collection('users')
    .doc(actorId)
    .collection('orders')
    .doc(orderId);
  const actorSnapshot = await transaction.get(actorReference);
  if (!actorSnapshot.exists) {
    throw new HttpsError('not-found', 'Order was not found.');
  }
  const actorOrder = actorSnapshot.data() as GroupOrderDocument;
  assertGroupOrderDocument(actorOrder);

  const bucketReference = firestore
    .collection('buckets')
    .doc(requiredString(actorOrder.bucketId, 'Bucket ID', 160));
  const bucketSnapshot = await transaction.get(bucketReference);
  if (!bucketSnapshot.exists) {
    throw new HttpsError('not-found', 'Bucket was not found.');
  }
  const bucket = bucketSnapshot.data() as BucketRecord;
  const ownerId = requiredString(bucket.ownerId, 'Bucket owner ID', 160);
  await assertManagerAccess(transaction, bucketReference, ownerId, actorId);

  if (ownerId === actorId) {
    return { actorOrder, canonicalOrder: actorOrder, ownerId };
  }

  const ownerReference = firestore
    .collection('users')
    .doc(ownerId)
    .collection('orders')
    .doc(orderId);
  const ownerSnapshot = await transaction.get(ownerReference);
  const canonicalOrder = ownerSnapshot.exists
    ? (ownerSnapshot.data() as GroupOrderDocument)
    : actorOrder;
  assertGroupOrderDocument(canonicalOrder);
  return { actorOrder, canonicalOrder, ownerId };
};

const receiptUserIds = (order: GroupOrderDocument): string[] => {
  const receipt = order.groupReceipt as {
    participantReceipts?: { userId?: unknown }[];
  };
  return (receipt.participantReceipts ?? [])
    .map((participant) => participant.userId)
    .filter((userId): userId is string => typeof userId === 'string' && userId.length > 0);
};

const transitionGroupOrderHandler = async (
  request: CallableRequest<unknown>,
): Promise<GroupOrderDocument> => {
  const actor = requireActor(request);
  const data = callableData(request.data);
  const orderId = requiredString(data.orderId, 'Order ID', 160);
  const status = requiredStatus(data.status);

  try {
    return await firestore.runTransaction(async (transaction) => {
      const context = await loadManagedOrder(
        transaction,
        actor.userId,
        orderId,
      );
      const timestamp = new Date().toISOString();
      const patch = buildGroupOrderTransitionPatch(
        context.canonicalOrder.status,
        status,
        timestamp,
      );
      const recipientIds = new Set([
        context.ownerId,
        actor.userId,
        context.canonicalOrder.userId,
        ...receiptUserIds(context.canonicalOrder),
      ]);
      const placedById = context.canonicalOrder.placedById;
      if (typeof placedById === 'string' && placedById) recipientIds.add(placedById);

      const references = [...recipientIds].map((userId) =>
        firestore.collection('users').doc(userId).collection('orders').doc(orderId),
      );
      const snapshots = await transaction.getAll(...references);
      for (const snapshot of snapshots) {
        if (snapshot.exists) transaction.set(snapshot.ref, patch, { merge: true });
      }

      return { ...context.actorOrder, ...patch };
    });
  } catch (error) {
    return throwCallableError('Group-order status transition', error, {
      actorId: actor.userId,
      orderId,
      status,
    });
  }
};

const repeatGroupOrderHandler = async (
  request: CallableRequest<unknown>,
): Promise<GroupOrderDocument> => {
  const actor = requireActor(request);
  const data = callableData(request.data);
  const orderId = requiredString(data.orderId, 'Order ID', 160);

  try {
    return await firestore.runTransaction(async (transaction) => {
      const context = await loadManagedOrder(
        transaction,
        actor.userId,
        orderId,
      );
      const reference = firestore
        .collection('users')
        .doc(actor.userId)
        .collection('orders')
        .doc();
      const repeated = repeatGroupOrderDocument(
        context.actorOrder,
        actor.userId,
        reference.id,
        new Date().toISOString(),
      );
      transaction.set(reference, repeated);
      return repeated;
    });
  } catch (error) {
    return throwCallableError('Group-order repetition', error, {
      actorId: actor.userId,
      orderId,
    });
  }
};

export const transitionGroupOrderV133 = onCall(
  { region: REGION },
  transitionGroupOrderHandler,
);
export const repeatGroupOrderV133 = onCall(
  { region: REGION },
  repeatGroupOrderHandler,
);
