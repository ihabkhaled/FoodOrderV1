import { dispatchAppEvent, subscribeToAppEvent } from '@/platform/browser';
import { readWebStorage, writeWebStorage } from '@/platform/storage';

import type { NotificationService } from '../contracts/notification-service.interfaces';
import type {
  AppNotification,
  NotificationDraft,
} from '../types/notifications.types';

const LOCAL_NOTIFICATION_KEY = 'foodorder:v1:notifications';
const LOCAL_NOTIFICATION_EVENT = 'foodorder:notifications-changed';

interface LocalNotificationDatabase {
  users: Record<string, AppNotification[]>;
}

const emptyLocalDatabase = (): LocalNotificationDatabase => ({ users: {} });

const readLocalDatabase = (): LocalNotificationDatabase => {
  const raw = readWebStorage(LOCAL_NOTIFICATION_KEY);
  if (!raw) return emptyLocalDatabase();
  try {
    return {
      ...emptyLocalDatabase(),
      ...(JSON.parse(raw) as LocalNotificationDatabase),
    };
  } catch {
    return emptyLocalDatabase();
  }
};

const writeLocalDatabase = (database: LocalNotificationDatabase): void => {
  writeWebStorage(LOCAL_NOTIFICATION_KEY, JSON.stringify(database));
  dispatchAppEvent(LOCAL_NOTIFICATION_EVENT);
};

const newestFirst = (notifications: AppNotification[]): AppNotification[] =>
  [...notifications]
    .toSorted((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 50);

export const pushLocalNotification = (
  userId: string,
  draft: NotificationDraft,
): AppNotification => {
  const database = readLocalDatabase();
  const notification: AppNotification = {
    ...draft,
    id: draft.id ?? `notification-${crypto.randomUUID()}`,
    createdAt: draft.createdAt ?? new Date().toISOString(),
    readAt: null,
  };
  database.users[userId] = newestFirst([
    notification,
    ...(database.users[userId] ?? []),
  ]);
  writeLocalDatabase(database);
  return notification;
};

export class LocalNotificationService implements NotificationService {
  subscribe(
    userId: string,
    listener: (notifications: AppNotification[]) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    const load = (): void => {
      try {
        listener(newestFirst(readLocalDatabase().users[userId] ?? []));
      } catch (error) {
        onError?.(error);
      }
    };
    load();
    const unsubscribeChange = subscribeToAppEvent(LOCAL_NOTIFICATION_EVENT, load);
    const unsubscribeStorage = subscribeToAppEvent('storage', load);
    return () => {
      unsubscribeChange();
      unsubscribeStorage();
    };
  }

  markRead(userId: string, notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return Promise.resolve();
    const database = readLocalDatabase();
    const selected = new Set(notificationIds);
    const readAt = new Date().toISOString();
    database.users[userId] = (database.users[userId] ?? []).map((notification) =>
      selected.has(notification.id) && !notification.readAt
        ? { ...notification, readAt }
        : notification,
    );
    writeLocalDatabase(database);
    return Promise.resolve();
  }
}
