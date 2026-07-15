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

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  route: string;
  entityType: 'friend' | 'group' | 'bucket' | 'order';
  entityId: string;
  actorId: string;
  actorName: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationDraft
  extends Omit<AppNotification, 'id' | 'createdAt' | 'readAt'> {
  id?: string;
  createdAt?: string;
}

export interface NotificationService {
  subscribe(
    userId: string,
    listener: (notifications: AppNotification[]) => void,
    onError?: (error: unknown) => void,
  ): () => void;
  markRead(userId: string, notificationIds: string[]): Promise<void>;
}
