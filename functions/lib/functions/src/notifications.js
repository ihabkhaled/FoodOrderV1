import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated, onDocumentDeleted, onDocumentUpdated, onDocumentWritten, } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { writeNotification, writeNotifications, } from './notificationCore.js';
const REGION = 'europe-west1';
const MAX_NOTIFICATIONS = 50;
const SYSTEM_ACTOR = { actorId: 'system', actorName: 'FoodOrder' };
const dataOf = (value) => typeof value === 'object' && value !== null
    ? value
    : {};
const requiredUserId = (auth) => {
    if (!auth)
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    return auth.uid;
};
const changed = (before, after, keys) => keys.some((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
const bucketRecipients = async (bucketId, ownerId) => {
    const members = await getFirestore()
        .collection('buckets')
        .doc(bucketId)
        .collection('members')
        .where('status', '==', 'active')
        .get();
    return [
        ownerId,
        ...members.docs.map((document) => document.id),
    ].filter(Boolean);
};
const orderNotification = (kind, title, message, orderId, createdAt) => ({
    id: `${kind}_${orderId}_${createdAt}`,
    kind,
    title,
    message,
    route: `/orders/${orderId}`,
    entityType: 'order',
    entityId: orderId,
    createdAt,
    ...SYSTEM_ACTOR,
});
export const getNotificationsV150 = onCall({ region: REGION }, async (request) => {
    const userId = requiredUserId(request.auth);
    const snapshot = await getFirestore()
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .orderBy('createdAt', 'desc')
        .limit(MAX_NOTIFICATIONS)
        .get();
    return snapshot.docs.map((document) => document.data());
});
export const markNotificationsReadV150 = onCall({ region: REGION }, async (request) => {
    const userId = requiredUserId(request.auth);
    const input = dataOf(request.data);
    const notificationIds = Array.isArray(input.notificationIds)
        ? [
            ...new Set(input.notificationIds.filter((value) => typeof value === 'string' && value.length > 0 && value.length <= 200)),
        ].slice(0, MAX_NOTIFICATIONS)
        : [];
    if (notificationIds.length === 0)
        return { success: true };
    const references = notificationIds.map((notificationId) => getFirestore()
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .doc(notificationId));
    const snapshots = await getFirestore().getAll(...references);
    const batch = getFirestore().batch();
    const readAt = new Date().toISOString();
    for (const snapshot of snapshots) {
        if (snapshot.exists)
            batch.update(snapshot.ref, { readAt });
    }
    await batch.commit();
    return { success: true };
});
export const notifyBucketUpdatedV150 = onDocumentUpdated({ document: 'buckets/{bucketId}', region: REGION }, async (event) => {
    const before = dataOf(event.data?.before.data());
    const after = dataOf(event.data?.after.data());
    if (!changed(before, after, [
        'title',
        'description',
        'visibility',
        'revision',
        'items',
        'aggregate',
        'pricingPolicy',
        'orderState',
    ])) {
        return;
    }
    const bucketId = event.params.bucketId;
    const bucket = after;
    const title = bucket.title ?? 'A shared bucket';
    const recipients = await bucketRecipients(bucketId, bucket.ownerId);
    await writeNotifications(recipients, {
        id: event.id,
        kind: 'bucket_updated',
        title: 'Bucket updated',
        message: `${title} was changed.`,
        route: '/buckets',
        entityType: 'bucket',
        entityId: bucketId,
        createdAt: event.time,
        ...SYSTEM_ACTOR,
    });
});
export const notifyBucketDeletedV150 = onDocumentDeleted({ document: 'buckets/{bucketId}', region: REGION }, async (event) => {
    const bucket = event.data?.data();
    if (!bucket)
        return;
    const bucketId = event.params.bucketId;
    const recipients = await bucketRecipients(bucketId, bucket.ownerId);
    await writeNotifications(recipients, {
        id: event.id,
        kind: 'bucket_deleted',
        title: 'Bucket deleted',
        message: `${bucket.title ?? 'A shared bucket'} was deleted.`,
        route: '/buckets',
        entityType: 'bucket',
        entityId: bucketId,
        createdAt: event.time,
        ...SYSTEM_ACTOR,
    });
});
export const notifyBucketSharedV150 = onDocumentCreated({
    document: 'buckets/{bucketId}/accessGrants/{grantId}',
    region: REGION,
}, async (event) => {
    const grant = event.data?.data();
    if (!grant)
        return;
    const bucketSnapshot = await getFirestore()
        .collection('buckets')
        .doc(grant.bucketId)
        .get();
    const bucketTitle = bucketSnapshot.data()?.title;
    let recipients = [];
    if (grant.subjectType === 'user') {
        recipients = [grant.subjectId];
    }
    else {
        const members = await getFirestore()
            .collection('friendGroups')
            .doc(grant.subjectId)
            .collection('members')
            .where('status', '==', 'active')
            .get();
        recipients = members.docs
            .map((document) => document.id)
            .filter((userId) => userId !== grant.grantedBy);
    }
    await writeNotifications(recipients, {
        id: event.id,
        kind: 'bucket_shared',
        title: 'Bucket shared',
        message: `${bucketTitle ?? 'A bucket'} was shared with ${grant.subjectName}.`,
        route: '/buckets',
        entityType: 'bucket',
        entityId: grant.bucketId,
        actorId: grant.grantedBy,
        actorName: 'Bucket owner',
        createdAt: event.time,
    });
});
export const notifyOrderPlacedV150 = onDocumentCreated({ document: 'users/{userId}/orders/{orderId}', region: REGION }, async (event) => {
    const order = event.data?.data();
    if (!order || order.status !== 'placed')
        return;
    const orderId = event.params.orderId;
    await writeNotification(event.params.userId, orderNotification('order_placed', 'Order placed', `${order.bucketTitle ?? 'Your order'} was placed.`, orderId, event.time));
});
export const notifyOrderUpdatedV150 = onDocumentUpdated({ document: 'users/{userId}/orders/{orderId}', region: REGION }, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after || JSON.stringify(before) === JSON.stringify(after))
        return;
    const orderId = event.params.orderId;
    let kind = 'order_updated';
    let title = 'Order updated';
    if (before.status !== after.status && after.status === 'completed') {
        kind = 'order_completed';
        title = 'Order completed';
    }
    else if (before.status !== after.status && after.status === 'cancelled') {
        kind = 'order_cancelled';
        title = 'Order cancelled';
    }
    await writeNotification(event.params.userId, orderNotification(kind, title, `${after.bucketTitle ?? 'Your order'} changed to ${after.status ?? 'an updated status'}.`, orderId, event.time));
});
export const notifyOrderDeletedV150 = onDocumentDeleted({ document: 'users/{userId}/orders/{orderId}', region: REGION }, async (event) => {
    const order = event.data?.data();
    const orderId = event.params.orderId;
    await writeNotification(event.params.userId, {
        id: event.id,
        kind: 'order_deleted',
        title: 'Order deleted',
        message: `${order?.bucketTitle ?? 'An order'} was deleted.`,
        route: '/orders',
        entityType: 'order',
        entityId: orderId,
        createdAt: event.time,
        ...SYSTEM_ACTOR,
    });
});
export const notifyFriendRequestV150 = onDocumentWritten({
    document: 'users/{userId}/friendRequests/{requestId}',
    region: REGION,
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after)
        return;
    const userId = event.params.userId;
    if (after.status === 'pending' &&
        before?.status !== 'pending' &&
        after.recipient.userId === userId) {
        await writeNotification(userId, {
            id: event.id,
            kind: 'friend_request',
            title: 'New friend request',
            message: `${after.sender.displayName} sent you a friend request.`,
            route: '/social',
            entityType: 'friend',
            entityId: after.sender.userId,
            actorId: after.sender.userId,
            actorName: after.sender.displayName,
            createdAt: event.time,
        });
    }
    if (after.status === 'accepted' &&
        before?.status !== 'accepted' &&
        after.sender.userId === userId) {
        await writeNotification(userId, {
            id: event.id,
            kind: 'friend_request_accepted',
            title: 'Friend request accepted',
            message: `${after.recipient.displayName} accepted your friend request.`,
            route: '/social',
            entityType: 'friend',
            entityId: after.recipient.userId,
            actorId: after.recipient.userId,
            actorName: after.recipient.displayName,
            createdAt: event.time,
        });
    }
});
export const notifyGroupInvitationV150 = onDocumentWritten({
    document: 'users/{userId}/groupInvitations/{groupId}',
    region: REGION,
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after)
        return;
    const userId = event.params.userId;
    if (after.status === 'pending' && before?.status !== 'pending') {
        await writeNotification(userId, {
            id: event.id,
            kind: 'group_invitation',
            title: 'New group invitation',
            message: `${after.owner.displayName} invited you to ${after.groupName}.`,
            route: '/social',
            entityType: 'group',
            entityId: after.groupId,
            actorId: after.owner.userId,
            actorName: after.owner.displayName,
            createdAt: event.time,
        });
    }
    if ((after.status === 'active' || after.status === 'declined') &&
        before?.status !== after.status) {
        await writeNotification(after.owner.userId, {
            id: event.id,
            kind: after.status === 'active'
                ? 'group_invitation_accepted'
                : 'group_invitation_declined',
            title: after.status === 'active'
                ? 'Group invitation accepted'
                : 'Group invitation declined',
            message: `${after.recipient.displayName} ${after.status === 'active' ? 'joined' : 'declined'} ${after.groupName}.`,
            route: '/social',
            entityType: 'group',
            entityId: after.groupId,
            actorId: after.recipient.userId,
            actorName: after.recipient.displayName,
            createdAt: event.time,
        });
    }
});
