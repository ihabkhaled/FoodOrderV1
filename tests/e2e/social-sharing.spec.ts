import { expect, type Page, test } from '@playwright/test';

const DATABASE_KEY = 'foodorder:v1:database';
const SESSION_KEY = 'foodorder:v1:session';
const NOW = '2026-07-14T12:00:00.000Z';

const switchUser = async (page: Page, userId: string): Promise<void> => {
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: SESSION_KEY, value: userId },
  );
};

const seedUsersAndBucket = async (page: Page): Promise<void> => {
  await page.addInitScript(
    ({ databaseKey, sessionKey, now }) => {
      if (localStorage.getItem(databaseKey)) return;
      const owner = {
        id: 'owner-1',
        fullName: 'Company Owner',
        email: 'owner@example.com',
        locale: 'en',
        theme: 'system',
        defaultCurrency: 'EGP',
        createdAt: now,
        updatedAt: now,
      };
      const friend = {
        id: 'friend-1',
        fullName: 'Alice Friend',
        email: 'alice@example.com',
        locale: 'en',
        theme: 'system',
        defaultCurrency: 'EGP',
        createdAt: now,
        updatedAt: now,
      };
      const bucket = {
        id: 'bucket-social',
        ownerId: owner.id,
        ownerName: owner.fullName,
        title: 'Company Lunch',
        description: 'Shared through the company group',
        currency: 'EGP',
        visibility: 'private',
        status: 'active',
        schemaVersion: 2,
        revision: 1,
        items: [
          {
            id: 'item-1',
            name: 'Meal',
            description: '',
            category: 'Main',
            unitPrice: 100,
            active: true,
            sortOrder: 0,
          },
        ],
        aggregate: {},
        createdAt: now,
        updatedAt: now,
      };
      localStorage.setItem(
        databaseKey,
        JSON.stringify({
          users: {
            [owner.id]: { password: 'Password1', profile: owner },
            [friend.id]: { password: 'Password1', profile: friend },
          },
          buckets: { [owner.id]: [bucket], [friend.id]: [] },
          orders: { [owner.id]: [], [friend.id]: [] },
          sharing: {
            members: {},
            invites: {},
            contributions: {},
            mutations: {},
            activity: {},
          },
        }),
      );
      localStorage.setItem(sessionKey, owner.id);
      localStorage.removeItem('foodorder:v1:social');
    },
    { databaseKey: DATABASE_KEY, sessionKey: SESSION_KEY, now: NOW },
  );
};

test.describe('friends, groups, and combined bucket sharing', () => {
  test('accepted group members automatically receive a bucket alongside a direct grant', async ({
    page,
  }) => {
    await seedUsersAndBucket(page);
    await page.goto('/social');

    await page.getByLabel('Email').fill('alice@example.com');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('Alice Friend')).toBeVisible();
    await page.getByRole('button', { name: 'Send friend request' }).click();

    await switchUser(page, 'friend-1');
    await page.goto('/social');
    const incoming = page
      .locator('section')
      .filter({ hasText: 'Incoming requests' });
    await incoming.getByRole('button', { name: 'Accept' }).click();
    await expect(page.getByText('Company Owner')).toBeVisible();

    await switchUser(page, 'owner-1');
    await page.goto('/social');
    await page.getByLabel('Group name').fill('Company A');
    await page.getByLabel('Description').fill('Work lunch group');
    await page.getByRole('button', { name: 'Create group' }).click();
    await expect(page.getByText('Company A')).toBeVisible();

    await page.getByLabel('Invite friend — Company A').selectOption('friend-1');
    await page.getByRole('button', { name: 'Invite friend' }).click();

    await switchUser(page, 'friend-1');
    await page.goto('/social');
    const invitations = page
      .locator('section')
      .filter({ hasText: 'Group invitations' });
    await invitations.getByRole('button', { name: 'Accept' }).click();

    await switchUser(page, 'owner-1');
    await page.goto('/buckets/bucket-social/social-share');
    await page.getByLabel('Select group').selectOption({ label: 'Company A' });
    await page
      .getByRole('button', { name: 'Share with selected group' })
      .click();
    await page.getByLabel('Select friend').selectOption({ label: 'Alice Friend' });
    await page
      .getByRole('button', { name: 'Share with selected friend' })
      .click();

    const groupGrant = page.locator('.list-row').filter({ hasText: 'Company A' });
    const friendGrant = page
      .locator('.list-row')
      .filter({ hasText: 'Alice Friend' });
    await expect(groupGrant.getByText('Company A')).toBeVisible();
    await expect(friendGrant.getByText('Alice Friend')).toBeVisible();

    await switchUser(page, 'friend-1');
    await page.goto('/buckets');
    await expect(
      page.getByRole('heading', { name: 'Company Lunch' }),
    ).toBeVisible();
  });
});
