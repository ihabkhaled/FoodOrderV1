import { getFunctions, httpsCallable } from '@/packages/firebase';
import { subscribeToAppEvent } from '@/platform/browser';

import type { NotificationService } from '../contracts/notification-service.interfaces';
import type { AppNotification } from '../types/notifications.types';
import { getFirebaseRuntime } from './firebase-runtime.gateway';

const REGION = 'europe-west1';
const POLL_INTERVAL_MS = 15_000;

const callable = <Request, Response>(name: string) =>
  httpsCallable<Request, Response>(
    getFunctions(getFirebaseRuntime().app, REGION),
    name,
  );

export class FirestoreNotificationService implements NotificationService {
  subscribe(
    _userId: string,
    listener: (notifications: AppNotification[]) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    let active = true;
    const load = async (): Promise<void> => {
      try {
        const result = await callable<Record<string, never>, AppNotification[]>(
          'getNotificationsV150',
        )({});
        if (active) listener(result.data);
      } catch (error) {
        if (active) onError?.(error);
      }
    };
    const refresh = (): void => {
      void load();
    };
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    const unsubscribeFocus = subscribeToAppEvent('focus', refresh);
    return () => {
      active = false;
      clearInterval(timer);
      unsubscribeFocus();
    };
  }

  async markRead(
    _userId: string,
    notificationIds: string[],
  ): Promise<void> {
    if (notificationIds.length === 0) return;
    await callable<{ notificationIds: string[] }, { success: true }>(
      'markNotificationsReadV150',
    )({ notificationIds });
  }

  async savePushToken(
    _userId: string,
    token: string,
    platform: string,
  ): Promise<void> {
    // Token documents are callable-only; clients may never write them directly.
    await callable<{ token: string; platform: string }, { success: true }>(
      'savePushTokenV180',
    )({ token, platform });
  }

  async removePushToken(_userId: string, token: string): Promise<void> {
    await callable<{ token: string }, { success: true }>('removePushTokenV180')(
      { token },
    );
  }
}
