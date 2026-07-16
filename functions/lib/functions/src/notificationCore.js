import { randomUUID } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
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
export const writeNotification = async (userId, input) => {
    const batch = getFirestore().batch();
    const notification = queueNotification(batch, userId, input);
    await batch.commit();
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
};
