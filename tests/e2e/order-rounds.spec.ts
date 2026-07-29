import { expect, type Page, test } from '@playwright/test';

const DATABASE_KEY = 'foodorder:v1:database';
const SESSION_KEY = 'foodorder:v1:session';
const NOTIFICATIONS_KEY = 'foodorder:v1:notifications';
const NOW = '2026-07-29T12:00:00.000Z';

interface StoredSession {
  readonly id: string;
  readonly menuTemplateId: string;
  readonly status: string;
  readonly title: string;
  readonly participantIds?: readonly string[];
}

interface StoredNotification {
  readonly kind: string;
  readonly route: string;
  readonly entityId: string;
}

/** Seeds one shared template owned by `owner-1` with `member-1` as an editor. */
const seedSharedTemplate = async (
  page: Page,
  sessionUserId: string,
): Promise<void> => {
  await page.addInitScript(
    ({ databaseKey, sessionKey, now, currentUserId }) => {
      const owner = {
        id: 'owner-1',
        fullName: 'Round Owner',
        email: 'round-owner@example.com',
        locale: 'en',
        theme: 'system',
        defaultCurrency: 'EGP',
        createdAt: now,
        updatedAt: now,
      };
      const member = {
        id: 'member-1',
        fullName: 'Round Member',
        email: 'round-member@example.com',
        locale: 'en',
        theme: 'system',
        defaultCurrency: 'EGP',
        createdAt: now,
        updatedAt: now,
      };
      const bucket = {
        id: 'bucket-round',
        ownerId: owner.id,
        ownerName: owner.fullName,
        title: 'Friday Lunch',
        description: 'Reusable weekly template',
        currency: 'EGP',
        visibility: 'shared',
        status: 'active',
        orderState: 'open',
        customItemMode: 'proposal',
        schemaVersion: 3,
        revision: 2,
        items: [
          {
            id: 'item-1',
            name: 'Koshary',
            description: '',
            category: 'Lunch',
            unitPrice: 45,
            active: true,
            sortOrder: 0,
            createdByUserId: owner.id,
            createdByName: owner.fullName,
            source: 'catalog',
            approvalStatus: 'approved',
          },
        ],
        aggregate: {},
        createdAt: now,
        updatedAt: now,
      };
      const membership = (
        userId: string,
        displayName: string,
        role: string,
      ) => ({
        userId,
        displayName,
        role,
        status: 'active',
        invitedBy: owner.id,
        joinedAt: now,
        updatedAt: now,
      });

      localStorage.setItem(
        databaseKey,
        JSON.stringify({
          users: {
            [owner.id]: { password: 'Password1', profile: owner },
            [member.id]: { password: 'Password1', profile: member },
          },
          buckets: { [owner.id]: [bucket], [member.id]: [] },
          orders: { [owner.id]: [], [member.id]: [] },
          sharing: {
            members: {
              [bucket.id]: [
                membership(owner.id, owner.fullName, 'owner'),
                membership(member.id, member.fullName, 'editor'),
              ],
            },
            invites: {},
            contributions: {},
            mutations: {},
            activity: {},
          },
        }),
      );
      localStorage.setItem(sessionKey, currentUserId);
    },
    {
      databaseKey: DATABASE_KEY,
      sessionKey: SESSION_KEY,
      now: NOW,
      currentUserId: sessionUserId,
    },
  );
};

const readSessions = async (page: Page): Promise<StoredSession[]> =>
  page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      orderSessions?: { sessions?: Record<string, StoredSession> };
    };
    return Object.values(parsed.orderSessions?.sessions ?? {});
  }, DATABASE_KEY);

const readNotifications = async (
  page: Page,
  userId: string,
): Promise<StoredNotification[]> =>
  page.evaluate(
    ({ key, id }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as {
        users?: Record<string, StoredNotification[]>;
      };
      return parsed.users?.[id] ?? [];
    },
    { key: NOTIFICATIONS_KEY, id: userId },
  );

test.describe('buckets are reusable order templates', () => {
  test('the owner starts a round from a shared template and members are notified', async ({
    page,
  }) => {
    await seedSharedTemplate(page, 'owner-1');
    await page.goto('/buckets');

    await page.getByRole('link', { name: 'Start round' }).first().click();
    await expect(page).toHaveURL(/\/sessions\/new\/bucket-round$/u);

    await page.getByRole('button', { name: 'Open order session' }).click();
    await expect(page).toHaveURL(/\/sessions\/session_[\w-]+$/u);

    const sessions = await readSessions(page);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.menuTemplateId).toBe('bucket-round');
    expect(sessions[0]?.status).toBe('collecting');
    expect(sessions[0]?.title).toBe('Friday Lunch');

    // The template itself is untouched and can be run again. Navigation stays
    // client-side so the seeded database is not reloaded.
    await page.getByRole('link', { name: 'Buckets' }).first().click();
    await expect(
      page.getByRole('heading', { name: 'Friday Lunch' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Start round' }).first(),
    ).toBeVisible();

    const memberNotifications = await readNotifications(page, 'member-1');
    expect(memberNotifications).toHaveLength(1);
    expect(memberNotifications[0]?.kind).toBe('session_opened');
    expect(memberNotifications[0]?.entityId).toBe(sessions[0]?.id);

    // The organizer never notifies themselves.
    expect(await readNotifications(page, 'owner-1')).toHaveLength(0);
  });

  test('a second round reuses the same template without renaming it', async ({
    page,
  }) => {
    await seedSharedTemplate(page, 'owner-1');
    // Only the first visit loads the page: later navigation is client-side so
    // the seeded database survives and both rounds accumulate.
    await page.goto('/buckets');

    for (const _round of [1, 2]) {
      await page.getByRole('link', { name: 'Start round' }).first().click();
      await page.getByRole('button', { name: 'Open order session' }).click();
      await expect(page).toHaveURL(/\/sessions\/session_[\w-]+$/u);
      await page.getByRole('link', { name: 'Buckets' }).first().click();
      await expect(page).toHaveURL(/\/buckets$/u);
    }

    const sessions = await readSessions(page);
    expect(sessions).toHaveLength(2);
    expect(
      sessions.every((session) => session.menuTemplateId === 'bucket-round'),
    ).toBe(true);
    expect(sessions.every((session) => session.title === 'Friday Lunch')).toBe(
      true,
    );

    const memberNotifications = await readNotifications(page, 'member-1');
    expect(memberNotifications).toHaveLength(2);
  });
});
