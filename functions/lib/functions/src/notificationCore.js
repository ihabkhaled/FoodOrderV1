import { randomUUID } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
const notificationRecord = (input) => ({
    ...input,
    id: input.id ?? randomUUID(),
    createdAt: input.createdAt ?? new Date().toISOString(),
    readAt: null,
});
export const queueNotification = (batch, userId, input) => {
    const notification = notificationRecord(input);
    batch.set(getFirestore()
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .doc(notification.id), notification);
    return notification;
};
export const queueTransactionNotification = (transaction, userId, input) => {
    const notification = notificationRecord(input);
    transaction.set(getFirestore()
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .doc(notification.id), notification);
    return notification;
};
/**
 * Delivers a notification to every device the recipients registered, so a
 * closed app still surfaces it. Stale tokens are pruned as the send reports
 * them, and a messaging failure never fails the caller: the in-app record is
 * already written and remains the source of truth.
 */
const pushToDevices = async (userIds, input) => {
    const recipients = [...new Set(userIds.filter(Boolean))];
    if (recipients.length === 0)
        return;
    try {
        const tokenSnapshots = await Promise.all(recipients.map((userId) => getFirestore()
            .collection('users')
            .doc(userId)
            .collection('pushTokens')
            .get()));
        const owners = new Map();
        for (const [index, snapshot] of tokenSnapshots.entries()) {
            const owner = recipients[index];
            if (!owner)
                continue;
            for (const document of snapshot.docs)
                owners.set(document.id, owner);
        }
        const tokens = [...owners.keys()];
        if (tokens.length === 0)
            return;
        const response = await getMessaging().sendEachForMulticast({
            tokens,
            notification: { title: input.title, body: input.message },
            data: { route: input.route, kind: input.kind, entityId: input.entityId },
        });
        const stale = response.responses
            .map((result, index) => ({ result, token: tokens[index] ?? '' }))
            .filter(({ result, token }) => token !== '' &&
            result.error?.code === 'messaging/registration-token-not-registered' ||
            result.error?.code === 'messaging/invalid-registration-token');
        if (stale.length === 0)
            return;
        const batch = getFirestore().batch();
        for (const { token } of stale) {
            const userId = owners.get(token);
            if (!userId)
                continue;
            batch.delete(getFirestore()
                .collection('users')
                .doc(userId)
                .collection('pushTokens')
                .doc(token));
        }
        await batch.commit();
    }
    catch {
        // Push is best-effort; the stored notification still reaches the app.
    }
};
export const writeNotification = async (userId, input) => {
    const batch = getFirestore().batch();
    const notification = queueNotification(batch, userId, input);
    await batch.commit();
    await pushToDevices([userId], input);
    return notification;
};
export const writeNotifications = async (userIds, input) => {
    const recipients = [...new Set(userIds.filter(Boolean))];
    if (recipients.length === 0)
        return;
    const batch = getFirestore().batch();
    const notificationId = input.id ?? randomUUID();
    for (const userId of recipients) {
        queueNotification(batch, userId, {
            ...input,
            id: `${notificationId}_${userId}`,
        });
    }
    await batch.commit();
    await pushToDevices(recipients, input);
};
