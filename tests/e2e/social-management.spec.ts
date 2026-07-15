import { expect, type Page, test } from '@playwright/test';

const DATABASE_KEY = 'foodorder:v1:database';
const SOCIAL_KEY = 'foodorder:v1:social';
const SESSION_KEY = 'foodorder:v1:session';
const NOTIFICATION_KEY = 'foodorder:v1:notifications';
const NOW = '2026-07-16T10:00:00.000Z';

const switchUser = async (page: Page, userId: string): Promise<void> => {
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: SESSION_KEY, value: userId },
  );
};

const seedSocialManagement = async (page: Page): Promise<void> => {
  await page.addInitScript(
    ({ databaseKey, socialKey, sessionKey, notificationKey, now }) => {
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
      const alice = {
        id: 'alice-1',
        fullName: 'Alice Friend',
        email: 'alice@example.com',
        locale: 'en',
        theme: 'system',
        defaultCurrency: 'EGP',
        createdAt: now,
        updatedAt: now,
      };
      const bob = {
        id: 'bob-1',
        fullName: 'Bob Pending',
        email: 'bob@example.com',
        locale: 'en',
        theme: 'system',
        defaultCurrency: 'EGP',
        createdAt: now,
        updatedAt: now,
      };
      const socialUser = (profile: typeof owner) => ({
        userId: profile.id,
        displayName: profile.fullName,
        email: profile.email,
      });
      const ownerUser = socialUser(owner);
      const aliceUser = socialUser(alice);
      const bobUser = socialUser(bob);
      const activeMember = (profile: typeof owner, invitedBy: string) => ({
        ...socialUser(profile),
        status: 'active',
        invitedBy,
        invitedAt: now,
        respondedAt: now,
      });
      const pendingMember = (profile: typeof owner) => ({
        ...socialUser(profile),
        status: 'pending',
        invitedBy: owner.id,
        invitedAt: now,
        respondedAt: null,
      });
      const bucket = {
        id: 'bucket-social',
        ownerId: owner.id,
        ownerName: owner.fullName,
        title: 'Company Lunch',
        description: '',
        currency: 'EGP',
        visibility: 'shared',
        status: 'active',
        schemaVersion: 3,
        revision: 2,
        orderState: 'open',
        customItemMode: 'direct',
        pricingPolicy: {
          vatBasisPoints: 0,
          serviceBasisPoints: 0,
          deliveryMinor: 0,
          vatAllocation: 'proportional',
          serviceAllocation: 'proportional',
          deliveryAllocation: 'equal',
        },
        frozenAt: null,
        frozenBy: null,
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
            [alice.id]: { password: 'Password1', profile: alice },
            [bob.id]: { password: 'Password1', profile: bob },
          },
          buckets: { [owner.id]: [bucket], [alice.id]: [], [bob.id]: [] },
          orders: { [owner.id]: [], [alice.id]: [], [bob.id]: [] },
          sharing: {
            members: {
              [bucket.id]: [
                {
                  userId: alice.id,
                  displayName: alice.fullName,
                  email: alice.email,
                  role: 'editor',
                  status: 'active',
                  canCreateCustomItems: true,
                  canSetCustomItemPrice: true,
                  invitedBy: owner.id,
                  joinedAt: now,
                  updatedAt: now,
                  accessSources: ['group_group-company', 'user_alice-1'],
                },
              ],
            },
            invites: {},
            contributions: {},
            mutations: {},
            activity: {},
          },
        }),
      );
      localStorage.setItem(
        socialKey,
        JSON.stringify({
          requests: [],
          friends: {
            [owner.id]: [aliceUser, bobUser],
            [alice.id]: [ownerUser],
            [bob.id]: [ownerUser],
          },
          groups: [
            {
              id: 'group-company',
              ownerId: owner.id,
              name: 'Company A',
              description: 'Work lunch group',
              members: [
                activeMember(owner, owner.id),
                activeMember(alice, owner.id),
                pendingMember(bob),
              ],
              createdAt: now,
              updatedAt: now,
            },
            {
              id: 'group-community',
              ownerId: owner.id,
              name: 'Community',
              description: 'Weekend group',
              members: [
                activeMember(owner, owner.id),
                activeMember(alice, owner.id),
              ],
              createdAt: now,
              updatedAt: now,
            },
          ],
          invitations: [
            {
              groupId: 'group-company',
              groupName: 'Company A',
              owner: ownerUser,
              recipient: aliceUser,
              status: 'active',
              invitedAt: now,
              respondedAt: now,
            },
            {
              groupId: 'group-company',
              groupName: 'Company A',
              owner: ownerUser,
              recipient: bobUser,
              status: 'pending',
              invitedAt: now,
              respondedAt: null,
            },
            {
              groupId: 'group-community',
              groupName: 'Community',
              owner: ownerUser,
              recipient: aliceUser,
              status: 'active',
              invitedAt: now,
              respondedAt: now,
            },
          ],
          grants: [
            {
              id: 'group_group-company',
              bucketId: bucket.id,
              subjectType: 'group',
              subjectId: 'group-company',
              subjectName: 'Company A',
              role: 'editor',
              grantedBy: owner.id,
              createdAt: now,
            },
            {
              id: 'user_alice-1',
              bucketId: bucket.id,
              subjectType: 'user',
              subjectId: alice.id,
              subjectName: alice.fullName,
              role: 'viewer',
              grantedBy: owner.id,
              createdAt: now,
            },
          ],
        }),
      );
      localStorage.setItem(sessionKey, owner.id);
      localStorage.removeItem(notificationKey);
    },
    {
      databaseKey: DATABASE_KEY,
      socialKey: SOCIAL_KEY,
      sessionKey: SESSION_KEY,
      notificationKey: NOTIFICATION_KEY,
      now: NOW,
    },
  );
};

test.describe('v1.5.0 social management and notifications', () => {
  test('owner edits groups, blocks duplicate invitations, removes members, and preserves direct access', async ({
    page,
  }) => {
    await seedSocialManagement(page);
    await page.goto('/social');

    const company = page.getByRole('article', {
      name: 'Group Company A',
      exact: true,
    });
    await expect(company.getByText('Every friend is already in or invited')).toBeVisible();

    await company.getByLabel('Edit group Company A').click();
    await company.getByLabel('Group name').fill('Team Alpha');
    await company.getByLabel('Description').fill('Updated team group');
    await company.getByRole('button', { name: 'Save changes' }).click();
    const renamed = page.getByRole('article', {
      name: 'Group Team Alpha',
      exact: true,
    });
    await expect(renamed).toBeVisible();
    await renamed.getByLabel('Remove member Alice Friend').click();
    await expect(
      renamed.getByLabel('Invite friend — Team Alpha'),
    ).toContainText('Alice Friend');
    await expect(
      renamed.getByLabel('Invite friend — Team Alpha'),
    ).not.toContainText('Bob Pending');

    const aliceMembership = await page.evaluate<
      { status: string; role: string; accessSources: string[] },
      string
    >((databaseKey) => {
      const raw = localStorage.getItem(databaseKey);
      if (!raw) throw new Error('Local database was not found.');
      const database = JSON.parse(raw) as {
        sharing: {
          members: Record<
            string,
            Array<{
              userId: string;
              status: string;
              role: string;
              accessSources: string[];
            }>
          >;
        };
      };
      const membership = database.sharing.members['bucket-social']?.find(
        (member) => member.userId === 'alice-1',
      );
      if (!membership) throw new Error('Alice membership was not found.');
      return membership;
    }, DATABASE_KEY);
    expect(aliceMembership.status).toBe('active');
    expect(aliceMembership.role).toBe('viewer');
    expect(aliceMembership.accessSources).toEqual(['user_alice-1']);

    await switchUser(page, 'alice-1');
    await page.goto('/social');
    await expect(
      page.getByRole('article', { name: 'Group Team Alpha', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('article', { name: 'Group Community', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Notifications' }).first(),
    ).toContainText('2');

    await page.getByLabel('Leave group Community').click();
    await expect(
      page.getByRole('article', { name: 'Group Community', exact: true }),
    ).toHaveCount(0);
    await page.getByLabel('Unfriend Company Owner').click();
    await expect(page.getByText('Company Owner')).toHaveCount(0);

    await switchUser(page, 'owner-1');
    await page.goto('/social');
    const notificationButton = page
      .getByRole('button', { name: 'Notifications' })
      .first();
    await expect(notificationButton).toContainText('2');
    await notificationButton.click();
    await expect(page.getByText('Member left group')).toBeVisible();
    await expect(page.getByText('Friend removed')).toBeVisible();

    await page.getByLabel('Delete group Team Alpha').click();
    await expect(
      page.getByRole('article', { name: 'Group Team Alpha', exact: true }),
    ).toHaveCount(0);
  });
});
