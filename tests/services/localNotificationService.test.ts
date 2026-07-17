import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppNotification, NotificationDraft } from '@/modules/data-access';
import { LocalNotificationService } from '@/modules/data-access';
import { pushLocalNotification } from '@/modules/data-access/gateways/local-notification.gateway';

const STORAGE_KEY = 'foodorder:v1:notifications';
const USER_ID = 'notification-user';

const createDraft = (
  index: number,
  overrides: Partial<NotificationDraft> = {},
): NotificationDraft => ({
  id: `notification-${index}`,
  kind: 'group_updated',
  title: `Update ${index}`,
  message: `Group update ${index}`,
  route: '/social',
  entityType: 'group',
  entityId: 'group-1',
  actorId: 'actor-1',
  actorName: 'Ihab Khaled',
  createdAt: `2026-07-17T12:${String(index).padStart(2, '0')}:00.000Z`,
  ...overrides,
});

const readNotifications = (): AppNotification[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const database = JSON.parse(raw) as {
    users: Record<string, AppNotification[]>;
  };
  return database.users[USER_ID] ?? [];
};

describe('LocalNotificationService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('publishes newest notifications first and caps the local inbox at fifty', () => {
    for (let index = 0; index < 52; index += 1) {
      pushLocalNotification(USER_ID, createDraft(index));
    }

    const listener = vi.fn<(notifications: AppNotification[]) => void>();
    const unsubscribe = new LocalNotificationService().subscribe(USER_ID, listener);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]?.[0]).toHaveLength(50);
    expect(listener.mock.calls[0]?.[0][0]?.id).toBe('notification-51');
    expect(listener.mock.calls[0]?.[0][49]?.id).toBe('notification-2');

    unsubscribe();
  });

  it('notifies active subscribers when an in-tab notification is added', () => {
    const listener = vi.fn<(notifications: AppNotification[]) => void>();
    const unsubscribe = new LocalNotificationService().subscribe(USER_ID, listener);

    pushLocalNotification(USER_ID, createDraft(1));

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[1]?.[0][0]).toMatchObject({
      id: 'notification-1',
      readAt: null,
    });

    unsubscribe();
  });

  it('marks only selected unread notifications and preserves prior read timestamps', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T14:00:00.000Z'));

    pushLocalNotification(USER_ID, createDraft(1));
    pushLocalNotification(USER_ID, createDraft(2));
    pushLocalNotification(
      USER_ID,
      createDraft(3, { id: 'notification-3', createdAt: '2026-07-17T12:03:00.000Z' }),
    );

    const current = readNotifications();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        users: {
          [USER_ID]: current.map((notification) =>
            notification.id === 'notification-3'
              ? { ...notification, readAt: '2026-07-17T13:00:00.000Z' }
              : notification,
          ),
        },
      }),
    );

    await new LocalNotificationService().markRead(USER_ID, [
      'notification-1',
      'notification-3',
    ]);

    const notifications = readNotifications();
    expect(
      notifications.find((notification) => notification.id === 'notification-1')
        ?.readAt,
    ).toBe('2026-07-17T14:00:00.000Z');
    expect(
      notifications.find((notification) => notification.id === 'notification-2')
        ?.readAt,
    ).toBeNull();
    expect(
      notifications.find((notification) => notification.id === 'notification-3')
        ?.readAt,
    ).toBe('2026-07-17T13:00:00.000Z');
  });

  it('recovers malformed local data as an empty inbox without reporting an error', () => {
    localStorage.setItem(STORAGE_KEY, '{malformed');
    const listener = vi.fn<(notifications: AppNotification[]) => void>();
    const onError = vi.fn<(error: unknown) => void>();

    const unsubscribe = new LocalNotificationService().subscribe(
      USER_ID,
      listener,
      onError,
    );

    expect(listener).toHaveBeenCalledWith([]);
    expect(onError).not.toHaveBeenCalled();

    unsubscribe();
  });
});
