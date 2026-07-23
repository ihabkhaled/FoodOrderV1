import { randomUUID } from 'node:crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError, onCall, } from 'firebase-functions/v2/https';
import { effectiveMemberCustomItemPermissions, memberCanPlaceGroupOrder, } from './memberPermissions.js';
import { buildOrderSnapshot, OrderValidationError, participantOrder, } from './orderDomain.js';
if (getApps().length === 0)
    initializeApp();
const firestore = getFirestore();
firestore.settings({ ignoreUndefinedProperties: true });
const REGION = 'europe-west1';
const MAX_ITEMS = 50;
const callableData = (value) => typeof value === 'object' && value !== null
    ? value
    : {};
const requiredString = (value, label, maxLength) => {
    if (typeof value !== 'string') {
        throw new HttpsError('invalid-argument', `${label} must be a string.`);
    }
    const normalized = value.trim();
    if (!normalized || normalized.length > maxLength) {
        throw new HttpsError('invalid-argument', `${label} must contain between 1 and ${maxLength} characters.`);
    }
    return normalized;
};
const optionalString = (value, maxLength) => {
    if (value === undefined || value === null)
        return '';
    if (typeof value !== 'string') {
        throw new HttpsError('invalid-argument', 'The supplied text value is invalid.');
    }
    return value.trim().slice(0, maxLength);
};
const nonNegativeMoney = (value, label) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new HttpsError('invalid-argument', `${label} must be a non-negative number.`);
    }
    return Math.round(value * 100) / 100;
};
const actorName = (token) => {
    const name = token.name;
    if (typeof name === 'string' && name.trim())
        return name.trim();
    const email = token.email;
    if (typeof email === 'string' && email.includes('@')) {
        return email.split('@', 1)[0] ?? 'User';
    }
    return 'User';
};
const requireActor = (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    }
    return {
        userId: request.auth.uid,
        displayName: actorName(request.auth.token),
    };
};
const nextRevision = (value) => typeof value === 'number' && Number.isInteger(value) && value >= 1
    ? value + 1
    : 2;
const safeError = (error) => {
    if (!(error instanceof Error))
        return { message: String(error) };
    return error.stack
        ? { message: error.message, stack: error.stack }
        : { message: error.message };
};
const throwCallableError = (operation, error, context) => {
    if (error instanceof HttpsError)
        throw error;
    if (error instanceof OrderValidationError) {
        throw new HttpsError('failed-precondition', error.message);
    }
    logger.error(`${operation} failed.`, {
        ...context,
        error: safeError(error),
    });
    throw new HttpsError('internal', 'The cloud action could not be completed. Please try again.');
};
const normalizeBucket = (raw, bucketId) => {
    const ownerId = typeof raw.ownerId === 'string' && raw.ownerId.trim()
        ? raw.ownerId.trim()
        : '';
    if (!ownerId) {
        throw new HttpsError('failed-precondition', 'The bucket owner information is missing.');
    }
    return {
        ...raw,
        id: typeof raw.id === 'string' && raw.id.trim()
            ? raw.id.trim()
            : bucketId,
        ownerId,
        items: Array.isArray(raw.items) ? raw.items : [],
        aggregate: raw.aggregate ?? {},
    };
};
const actorOrder = (order, actorId) => {
    if (actorId === order.userId)
        return order;
    const isParticipant = order.groupReceipt.participantReceipts.some((receipt) => receipt.userId === actorId);
    if (isParticipant) {
        return participantOrder(order, actorId);
    }
    return { ...order, userId: actorId };
};
const requireFinalizerAccess = async (transaction, bucketReference, bucket, actorId) => {
    if (actorId === bucket.ownerId)
        return;
    const memberSnapshot = await transaction.get(bucketReference.collection('members').doc(actorId));
    const member = memberSnapshot.exists
        ? memberSnapshot.data()
        : null;
    if (!member || !memberCanPlaceGroupOrder(member)) {
        throw new HttpsError('permission-denied', 'Only the bucket owner or an active editor may place this order.');
    }
};
const findExistingActorOrder = async (transaction, bucket, actorId) => {
    if (bucket.orderState !== 'ordered' || !bucket.lastOrderId)
        return null;
    const actorOrderSnapshot = await transaction.get(firestore
        .collection('users')
        .doc(actorId)
        .collection('orders')
        .doc(bucket.lastOrderId));
    if (actorOrderSnapshot.exists) {
        return actorOrderSnapshot.data();
    }
    const ownerOrderSnapshot = await transaction.get(firestore
        .collection('users')
        .doc(bucket.ownerId)
        .collection('orders')
        .doc(bucket.lastOrderId));
    return ownerOrderSnapshot.exists
        ? actorOrder(ownerOrderSnapshot.data(), actorId)
        : null;
};
const finalizeGroupOrderHandler = async (request) => {
    const actor = requireActor(request);
    const data = callableData(request.data);
    const bucketId = requiredString(data.bucketId, 'Bucket ID', 160);
    const notes = optionalString(data.notes, 500);
    const bucketReference = firestore.collection('buckets').doc(bucketId);
    try {
        return await firestore.runTransaction(async (transaction) => {
            const bucketSnapshot = await transaction.get(bucketReference);
            if (!bucketSnapshot.exists) {
                throw new HttpsError('not-found', 'Bucket was not found.');
            }
            const bucket = normalizeBucket(bucketSnapshot.data(), bucketId);
            const ownerId = bucket.ownerId;
            await requireFinalizerAccess(transaction, bucketReference, bucket, actor.userId);
            const existingOrder = await findExistingActorOrder(transaction, bucket, actor.userId);
            if (existingOrder)
                return existingOrder;
            const state = bucket.orderState ?? 'open';
            if (state !== 'open' && state !== 'frozen') {
                throw new HttpsError('failed-precondition', `A bucket in ${state} state cannot be ordered.`);
            }
            const contributionSnapshot = await transaction.get(bucketReference.collection('contributions'));
            const contributions = contributionSnapshot.docs.map((snapshot) => snapshot.data());
            const timestamp = new Date().toISOString();
            const orderId = firestore
                .collection('users')
                .doc(ownerId)
                .collection('orders')
                .doc().id;
            const snapshot = buildOrderSnapshot(bucket, contributions, ownerId, notes, orderId, timestamp);
            const order = {
                ...snapshot.order,
                placedById: actor.userId,
                placedByName: actor.displayName,
            };
            transaction.update(bucketReference, {
                aggregate: snapshot.aggregate,
                orderState: 'ordered',
                frozenAt: bucket.frozenAt ?? timestamp,
                frozenBy: bucket.frozenBy ?? actor.userId,
                lastOrderId: order.id,
                revision: order.sourceBucketRevision,
                updatedAt: timestamp,
            });
            transaction.set(firestore.collection('users').doc(ownerId).collection('orders').doc(order.id), order);
            const participantIds = new Set();
            for (const participant of order.groupReceipt.participantReceipts) {
                participantIds.add(participant.userId);
                if (participant.userId === ownerId)
                    continue;
                transaction.set(firestore
                    .collection('users')
                    .doc(participant.userId)
                    .collection('orders')
                    .doc(order.id), participantOrder(order, participant.userId));
            }
            const result = actorOrder(order, actor.userId);
            if (actor.userId !== ownerId && !participantIds.has(actor.userId)) {
                transaction.set(firestore
                    .collection('users')
                    .doc(actor.userId)
                    .collection('orders')
                    .doc(order.id), result);
            }
            transaction.set(bucketReference.collection('orderMutations').doc(order.id), {
                orderId: order.id,
                ownerId,
                placedById: actor.userId,
                placedByName: actor.displayName,
                createdAt: timestamp,
            });
            return result;
        });
    }
    catch (error) {
        return throwCallableError('Group-order finalization', error, {
            bucketId,
            actorId: actor.userId,
        });
    }
};
const addCustomBucketItemHandler = async (request) => {
    const actor = requireActor(request);
    const data = callableData(request.data);
    const bucketId = requiredString(data.bucketId, 'Bucket ID', 160);
    const input = {
        name: requiredString(data.name, 'Item name', 120),
        description: optionalString(data.description, 500),
        category: optionalString(data.category, 80),
        unitPrice: nonNegativeMoney(data.unitPrice ?? 0, 'Item price'),
    };
    const bucketReference = firestore.collection('buckets').doc(bucketId);
    try {
        return await firestore.runTransaction(async (transaction) => {
            const bucketSnapshot = await transaction.get(bucketReference);
            if (!bucketSnapshot.exists) {
                throw new HttpsError('not-found', 'Bucket was not found.');
            }
            const bucket = normalizeBucket(bucketSnapshot.data(), bucketId);
            const items = bucket.items ?? [];
            if ((bucket.orderState ?? 'open') !== 'open') {
                throw new HttpsError('failed-precondition', 'The bucket is frozen.');
            }
            if (items.length >= MAX_ITEMS) {
                throw new HttpsError('resource-exhausted', 'The bucket has reached its item limit.');
            }
            let approved = true;
            let canSetPrice = true;
            if (bucket.ownerId !== actor.userId) {
                const memberSnapshot = await transaction.get(bucketReference.collection('members').doc(actor.userId));
                const member = memberSnapshot.exists
                    ? memberSnapshot.data()
                    : null;
                if (!member || member.status !== 'active') {
                    throw new HttpsError('permission-denied', 'Active bucket membership is required.');
                }
                const canContribute = member.role === 'editor' || member.role === 'contributor';
                const permissions = effectiveMemberCustomItemPermissions(member);
                if (!canContribute || !permissions.canCreateCustomItems) {
                    throw new HttpsError('permission-denied', 'Custom-item permission is required.');
                }
                if ((bucket.customItemMode ?? 'proposal') === 'disabled') {
                    throw new HttpsError('failed-precondition', 'Custom items are disabled.');
                }
                approved = bucket.customItemMode === 'direct';
                canSetPrice = permissions.canSetCustomItemPrice;
            }
            const item = {
                id: randomUUID(),
                name: input.name,
                description: input.description,
                category: input.category,
                unitPrice: canSetPrice ? input.unitPrice : 0,
                active: approved,
                sortOrder: items.length,
                createdByUserId: actor.userId,
                createdByName: actor.displayName,
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
    }
    catch (error) {
        return throwCallableError('Custom-item creation', error, {
            bucketId,
            actorId: actor.userId,
        });
    }
};
const approveCustomBucketItemHandler = async (request) => {
    const actor = requireActor(request);
    const data = callableData(request.data);
    const bucketId = requiredString(data.bucketId, 'Bucket ID', 160);
    const itemId = requiredString(data.itemId, 'Item ID', 160);
    const unitPrice = nonNegativeMoney(data.unitPrice, 'Item price');
    const bucketReference = firestore.collection('buckets').doc(bucketId);
    try {
        return await firestore.runTransaction(async (transaction) => {
            const bucketSnapshot = await transaction.get(bucketReference);
            if (!bucketSnapshot.exists) {
                throw new HttpsError('not-found', 'Bucket was not found.');
            }
            const bucket = normalizeBucket(bucketSnapshot.data(), bucketId);
            if (bucket.ownerId !== actor.userId) {
                throw new HttpsError('permission-denied', 'Only the bucket owner may approve items.');
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
            const approved = {
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
    }
    catch (error) {
        return throwCallableError('Custom-item approval', error, {
            bucketId,
            actorId: actor.userId,
        });
    }
};
export const finalizeGroupOrderV132 = onCall({ region: REGION }, finalizeGroupOrderHandler);
export const addCustomBucketItemV132 = onCall({ region: REGION }, addCustomBucketItemHandler);
export const approveCustomBucketItemV132 = onCall({ region: REGION }, approveCustomBucketItemHandler);
export const finalizeGroupOrder = onCall({ region: REGION }, finalizeGroupOrderHandler);
export const addCustomBucketItem = onCall({ region: REGION }, addCustomBucketItemHandler);
export const approveCustomBucketItem = onCall({ region: REGION }, approveCustomBucketItemHandler);
