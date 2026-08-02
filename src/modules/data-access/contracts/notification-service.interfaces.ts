import type { AppNotification } from '../types/notifications.types';

export interface NotificationService {
  subscribe(
    userId: string,
    listener: (notifications: AppNotification[]) => void,
    onError?: (error: unknown) => void,
  ): () => void;
  markRead(userId: string, notificationIds: string[]): Promise<void>;
  /**
   * Records this device's push delivery token so the server can reach it while
   * the app is closed. Implementations must be idempotent: the OS hands back
   * the same token on every launch.
   */
  savePushToken(userId: string, token: string, platform: string): Promise<void>;
  /** Stops delivery to this device, used on sign-out. */
  removePushToken(userId: string, token: string): Promise<void>;
}
