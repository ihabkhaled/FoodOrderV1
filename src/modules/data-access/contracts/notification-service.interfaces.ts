import type { AppNotification } from '../types/notifications.types';

export interface NotificationService {
  subscribe(
    userId: string,
    listener: (notifications: AppNotification[]) => void,
    onError?: (error: unknown) => void,
  ): () => void;
  markRead(userId: string, notificationIds: string[]): Promise<void>;
}
