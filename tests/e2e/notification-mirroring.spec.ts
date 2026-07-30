import { expect, type Page, test } from '@playwright/test';

import { suppressFeatureTours } from './helpers/featureTours';

test.beforeEach(async ({ page }) => {
  await suppressFeatureTours(page);
});

const NOTIFICATIONS_KEY = 'foodorder:v1:notifications';

interface TrayCapture {
  readonly title: string;
  readonly body: string;
}

declare global {
  interface Window {
    __trayNotifications?: TrayCapture[];
  }
}

/**
 * Replaces the Notification constructor with a recorder so the test can assert
 * what the app asked the operating system to display.
 */
const captureTrayNotifications = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    window.__trayNotifications = [];
    class RecordingNotification {
      static readonly permission = 'granted';
      static requestPermission(): Promise<string> {
        return Promise.resolve('granted');
      }
      closed = false;
      constructor(title: string, options?: { body?: string }) {
        window.__trayNotifications?.push({
          title,
          body: options?.body ?? '',
        });
      }
      addEventListener(): boolean {
        // Taps are exercised by the unit tests; recording is enough here.
        return true;
      }
      close(): void {
        this.closed = true;
      }
    }
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: RecordingNotification,
    });
  });
};

const register = async (page: Page, suffix: string): Promise<string> => {
  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('Tray Tester');
  const email = `tray-${suffix}-${Date.now()}@example.com`;
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/app$/u);
  return email;
};

/** Writes one unread notification straight into the local inbox. */
const deliverNotification = async (
  page: Page,
  id: string,
  message: string,
): Promise<void> => {
  await page.evaluate(
    ({ key, notificationId, body }) => {
      const sessionUserId = localStorage.getItem('foodorder:v1:session') ?? '';
      const raw = localStorage.getItem(key);
      const database = (raw ? JSON.parse(raw) : { users: {} }) as {
        users: Record<string, unknown[]>;
      };
      database.users[sessionUserId] = [
        {
          id: notificationId,
          kind: 'session_opened',
          title: 'New order round',
          message: body,
          route: '/sessions/session-1',
          entityType: 'session',
          entityId: 'session-1',
          actorId: 'owner-1',
          actorName: 'Owner',
          createdAt: new Date().toISOString(),
          readAt: null,
        },
        ...(database.users[sessionUserId] ?? []),
      ];
      localStorage.setItem(key, JSON.stringify(database));
      window.dispatchEvent(new Event('foodorder:notifications-changed'));
    },
    { key: NOTIFICATIONS_KEY, notificationId: id, body: message },
  );
};

/** Makes the page report itself as backgrounded so mirroring is allowed. */
const reportPageHidden = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
  });
};

const trayNotifications = async (page: Page): Promise<TrayCapture[]> =>
  page.evaluate(() => window.__trayNotifications ?? []);

test.describe('in-app notifications mirror to the OS tray', () => {
  test('a notification arriving while the app is in front is not mirrored', async ({
    page,
  }) => {
    await captureTrayNotifications(page);
    await register(page, 'visible');

    await deliverNotification(page, 'while-visible', 'Arrived while visible.');

    // The badge proves the notification reached the app. Only the badge in the
    // active placement (sidebar on desktop, topbar on mobile) is visible.
    await expect(
      page.locator('.notification-badge:visible').first(),
    ).toBeVisible();

    // Backgrounding and delivering a second notification gives a deterministic
    // signal that mirroring has run: if the first had been mirrored, it would
    // already sit ahead of this one in the tray.
    await reportPageHidden(page);
    await deliverNotification(page, 'while-hidden', 'Arrived while hidden.');

    await expect
      .poll(async () => {
        const captured = await trayNotifications(page);
        return captured.length;
      })
      .toBe(1);

    const [entry] = await trayNotifications(page);
    expect(entry?.body).toBe('Arrived while hidden.');
  });

  test('a notification arriving in the background raises exactly one tray entry', async ({
    page,
  }) => {
    await captureTrayNotifications(page);
    await register(page, 'hidden');
    await reportPageHidden(page);

    await deliverNotification(page, 'background-1', 'Owner opened a round.');

    await expect
      .poll(async () => {
        const captured = await trayNotifications(page);
        return captured.length;
      })
      .toBe(1);

    const [entry] = await trayNotifications(page);
    expect(entry?.title).toBe('New order round');
    expect(entry?.body).toBe('Owner opened a round.');

    // Re-delivering the same notification must not raise a second entry.
    await deliverNotification(page, 'background-1', 'Owner opened a round.');
    expect(await trayNotifications(page)).toHaveLength(1);
  });
});
