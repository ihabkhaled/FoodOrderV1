import { getFunctions, httpsCallable } from '@/packages/firebase';
import { getFirebaseRuntime } from '@/services/firebaseServices';
import type {
  AppNotification,
  NotificationDraft,
  NotificationService,
} from '@/types/notifications';

const REGION = 'europe-west1';
const LOCAL_NOTIFICATION_KEY = 'foodorder:v1:notifications';
const LOCAL_NOTIFICATION_EVENT = 'foodorder:notifications-changed';
const POLL_INTERVAL_MS = 15_000;

interface LocalNotificationDatabase {
  users: Record<string, AppNotification[]>;
}

const emptyLocalDatabase = (): LocalNotificationDatabase => ({ users: {} });

const readLocalDatabase = (): LocalNotificationDatabase => {
  const raw = localStorage.getItem(LOCAL_NOTIFICATION_KEY);
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
  localStorage.setItem(LOCAL_NOTIFICATION_KEY, JSON.stringify(database));
  window.dispatchEvent(new Event(LOCAL_NOTIFICATION_EVENT));
};

const newestFirst = (notifications: AppNotification[]): AppNotification[] =>
  [...notifications]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
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
    const timer = window.setInterval(refresh, POLL_INTERVAL_MS);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
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
}

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
    window.addEventListener(LOCAL_NOTIFICATION_EVENT, load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener(LOCAL_NOTIFICATION_EVENT, load);
      window.removeEventListener('storage', load);
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
