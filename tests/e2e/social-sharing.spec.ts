import { expect, type Page, test } from '@playwright/test';

const DATABASE_KEY = 'foodorder:v1:database';
const SOCIAL_KEY = 'foodorder:v1:social';
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
  test('targeted bucket invitations require acceptance before direct access activates', async ({
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
    await page.getByLabel('Select friend').selectOption({ label: 'Alice Friend' });
    await page
      .getByRole('button', { name: 'Invite friend to bucket' })
      .click();
    await expect(
      page.getByText(
        'Bucket invitation sent. Access activates after acceptance.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.locator('.list-row').filter({ hasText: 'Alice Friend' }),
    ).toHaveCount(0);

    const pendingInvitation = await page.evaluate<
      {
        status: string;
        role: string;
        directGrantCount: number;
        totalGrantCount: number;
      },
      string
    >((socialKey) => {
      const raw = localStorage.getItem(socialKey);
      if (!raw) throw new Error('Local social database was not found.');
      const database = JSON.parse(raw) as {
        bucketInvitations: Array<{
          bucketId: string;
          recipient: { userId: string };
          role: string;
          status: string;
        }>;
        grants: Array<{
          bucketId: string;
          subjectType: string;
          subjectId: string;
        }>;
      };
      const invitation = database.bucketInvitations.find(
        (candidate) =>
          candidate.bucketId === 'bucket-social' &&
          candidate.recipient.userId === 'friend-1',
      );
      if (!invitation) throw new Error('Pending bucket invitation was not found.');
      return {
        status: invitation.status,
        role: invitation.role,
        directGrantCount: database.grants.filter(
          (grant) =>
            grant.bucketId === 'bucket-social' &&
            grant.subjectType === 'user' &&
            grant.subjectId === 'friend-1',
        ).length,
        totalGrantCount: database.grants.length,
      };
    }, SOCIAL_KEY);
    expect(pendingInvitation).toEqual({
      status: 'pending',
      role: 'contributor',
      directGrantCount: 0,
      totalGrantCount: 0,
    });

    await switchUser(page, 'friend-1');
    await page.goto('/buckets');
    await expect(
      page.getByRole('heading', { name: 'Company Lunch' }),
    ).toHaveCount(0);
    await page.goto('/social');
    const bucketInvitations = page.locator('#bucket-invitations');
    const bucketInvitation = bucketInvitations
      .locator('.list-row')
      .filter({ hasText: 'Company Lunch' });
    await expect(bucketInvitation).toContainText('Invited by Company Owner');
    await expect(bucketInvitation).toContainText('Contributor');
    await expect(
      bucketInvitation.getByRole('button', { name: 'Accept', exact: true }),
    ).toBeVisible();
    await expect(
      bucketInvitation.getByRole('button', { name: 'Decline', exact: true }),
    ).toBeVisible();

    await page
      .getByRole('button', { name: 'Notifications' })
      .first()
      .click();
    const invitationNotification = page
      .locator('.notification-panel')
      .getByRole('button', { name: /^New bucket invitation/u });
    await expect(invitationNotification).toHaveCount(1);
    await expect(invitationNotification).toContainText(
      'Company Owner invited you to Company Lunch.',
    );
    await invitationNotification.click();
    await expect(page).toHaveURL(/\/social$/u);

    await bucketInvitation
      .getByRole('button', { name: 'Accept', exact: true })
      .click();
    await expect(
      page.getByText('Bucket invitation accepted.', { exact: true }),
    ).toBeVisible();
    await expect(bucketInvitation).toHaveCount(0);
    await page.goto('/buckets');
    await expect(
      page.getByRole('heading', { name: 'Company Lunch' }),
    ).toBeVisible();

    await switchUser(page, 'owner-1');
    await page.goto('/social');
    await page
      .getByRole('button', { name: 'Notifications' })
      .first()
      .click();
    const acceptedNotification = page
      .locator('.notification-panel')
      .getByRole('button', { name: /^Bucket invitation accepted/u });
    await expect(acceptedNotification).toHaveCount(1);
    await expect(acceptedNotification).toContainText(
      'Alice Friend accepted the invitation to Company Lunch.',
    );
    await acceptedNotification.click();
    await expect(page).toHaveURL(/\/buckets\/bucket-social\/collaborate$/u);

    await page.goto('/buckets/bucket-social/social-share');
    await page.getByLabel('Select group').selectOption({ label: 'Company A' });
    await page
      .getByRole('button', { name: 'Share with selected group' })
      .click();
    const groupGrant = page.locator('.list-row').filter({ hasText: 'Company A' });
    const friendGrant = page
      .locator('.list-row')
      .filter({ hasText: 'Alice Friend' });
    await expect(groupGrant.getByText('Company A')).toBeVisible();
    await expect(friendGrant.getByText('Alice Friend')).toBeVisible();

    const acceptedAccess = await page.evaluate<
      {
        invitationStatus: string;
        directGrantRole: string;
        directGrantInvitationId: string | null;
        membershipStatus: string;
        membershipRole: string;
        accessSources: string[];
      },
      { databaseKey: string; socialKey: string }
    >(({ databaseKey, socialKey }) => {
      const socialRaw = localStorage.getItem(socialKey);
      const databaseRaw = localStorage.getItem(databaseKey);
      if (!socialRaw || !databaseRaw) {
        throw new Error('Local sharing databases were not found.');
      }
      const socialDatabase = JSON.parse(socialRaw) as {
        bucketInvitations: Array<{
          bucketId: string;
          recipient: { userId: string };
          status: string;
        }>;
        grants: Array<{
          bucketId: string;
          subjectType: string;
          subjectId: string;
          role: string;
          invitationId?: string;
        }>;
      };
      const appDatabase = JSON.parse(databaseRaw) as {
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
      const invitation = socialDatabase.bucketInvitations.find(
        (candidate) =>
          candidate.bucketId === 'bucket-social' &&
          candidate.recipient.userId === 'friend-1',
      );
      const directGrant = socialDatabase.grants.find(
        (grant) =>
          grant.bucketId === 'bucket-social' &&
          grant.subjectType === 'user' &&
          grant.subjectId === 'friend-1',
      );
      const membership = appDatabase.sharing.members['bucket-social']?.find(
        (member) => member.userId === 'friend-1',
      );
      if (!invitation || !directGrant || !membership) {
        throw new Error('Accepted direct access was not materialized.');
      }
      return {
        invitationStatus: invitation.status,
        directGrantRole: directGrant.role,
        directGrantInvitationId: directGrant.invitationId ?? null,
        membershipStatus: membership.status,
        membershipRole: membership.role,
        accessSources: membership.accessSources,
      };
    }, { databaseKey: DATABASE_KEY, socialKey: SOCIAL_KEY });
    expect(acceptedAccess).toMatchObject({
      invitationStatus: 'accepted',
      directGrantRole: 'contributor',
      directGrantInvitationId: 'bucket-social_friend-1',
      membershipStatus: 'active',
      membershipRole: 'contributor',
    });
    expect(acceptedAccess.accessSources).toContain('user_friend-1');
    expect(
      acceptedAccess.accessSources.some((source) => source.startsWith('group_')),
    ).toBe(true);

    await switchUser(page, 'friend-1');
    await page.goto('/buckets');
    await expect(
      page.getByRole('heading', { name: 'Company Lunch' }),
    ).toBeVisible();
  });
});
