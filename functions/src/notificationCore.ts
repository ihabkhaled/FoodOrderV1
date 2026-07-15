import { randomUUID } from 'node:crypto';

import { getFirestore } from 'firebase-admin/firestore';

export type NotificationKind =
  | 'friend_request'
  | 'friend_request_accepted'
  | 'friend_removed'
  | 'group_invitation'
  | 'group_invitation_accepted'
  | 'group_invitation_declined'
  | 'group_updated'
  | 'group_member_removed'
  | 'group_member_left'
  | 'group_deleted'
  | 'bucket_shared'
  | 'bucket_updated'
  | 'bucket_deleted'
  | 'order_placed'
  | 'order_updated'
  | 'order_completed'
  | 'order_cancelled'
  | 'order_deleted';

export interface NotificationInput {
  kind: NotificationKind;
  title: string;
  message: string;
  route: string;
  entityType: 'friend' | 'group' | 'bucket' | 'order';
  entityId: string;
  actorId: string;
  actorName: string;
  createdAt?: string;
  id?: string;
}

export interface NotificationRecord extends NotificationInput {
  id: string;
  createdAt: string;
  readAt: string | null;
}

const notificationRecord = (input: NotificationInput): NotificationRecord => ({
  ...input,
  id: input.id ?? randomUUID(),
  createdAt: input.createdAt ?? new Date().toISOString(),
  readAt: null,
});

export const queueNotification = (
  batch: FirebaseFirestore.WriteBatch,
  userId: string,
  input: NotificationInput,
): NotificationRecord => {
  const notification = notificationRecord(input);
  batch.set(
    getFirestore()
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .doc(notification.id),
    notification,
  );
  return notification;
};

export const writeNotification = async (
  userId: string,
  input: NotificationInput,
): Promise<NotificationRecord> => {
  const batch = getFirestore().batch();
  const notification = queueNotification(batch, userId, input);
  await batch.commit();
  return notification;
};

export const writeNotifications = async (
  userIds: string[],
  input: NotificationInput,
): Promise<void> => {
  const recipients = [...new Set(userIds.filter(Boolean))];
  if (recipients.length === 0) return;
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
