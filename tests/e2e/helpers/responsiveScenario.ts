import type { Page } from '@playwright/test';

const DATABASE_KEY = 'foodorder:v1:database';
const SOCIAL_KEY = 'foodorder:v1:social';
const SESSION_KEY = 'foodorder:v1:session';
const NOW = '2026-07-16T10:00:00.000Z';

export const OWNER_ID = 'responsive-owner';
export const MEMBER_ID = 'responsive-member';
export const SHARED_BUCKET_INDEX = 11;
export const PRIVATE_BUCKET_INDEX = 10;
export const LAST_BUCKET_INDEX = 0;
export const LAST_ORDER_INDEX = 0;

export const responsiveBucketTitle = (index: number): string =>
  `Responsive bucket ${String(index).padStart(2, '0')} with a deliberately long menu title`;

export const LONG_GROUP_NAME =
  'International friends with exceptionally long names and lunch plans';
export const LONG_MEMBER_NAME =
  'Alexandria Member With An Exceptionally Long Display Name';

export async function seedResponsiveScenario(page: Page): Promise<void> {
  const bucketTitles = Array.from({ length: 12 }, (_, index) =>
    responsiveBucketTitle(index),
  );

  await page.addInitScript(
    ({
      databaseKey,
      socialKey,
      sessionKey,
      now,
      ownerId,
      memberId,
      bucketTitles: seededBucketTitles,
      sharedBucketIndex,
      groupName,
      memberName,
    }) => {
      if (localStorage.getItem(databaseKey)) return;

      const owner = {
        id: ownerId,
        fullName: 'Responsive Layout Owner',
        email: 'responsive.owner@example.test',
        locale: 'en',
        theme: 'system',
        defaultCurrency: 'EGP',
        createdAt: now,
        updatedAt: now,
      };
      const member = {
        id: memberId,
        fullName: memberName,
        email: 'alexandria.member.with.a.very.long.address@example.test',
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
      // The browser init script is serialized and cannot close over module helpers.
      // eslint-disable-next-line unicorn/consistent-function-scoping
      const timestamp = (index: number): string =>
        `2026-07-16T10:${String(index).padStart(2, '0')}:00.000Z`;
      const pricingPolicy = {
        vatBasisPoints: 0,
        serviceBasisPoints: 0,
        deliveryMinor: 0,
        vatAllocation: 'proportional',
        serviceAllocation: 'proportional',
        deliveryAllocation: 'equal',
      };
      const buckets = seededBucketTitles.map((title, index) => ({
        id: `responsive-bucket-${index}`,
        ownerId: owner.id,
        ownerName: owner.fullName,
        title,
        description:
          'A long description used to prove that bucket cards wrap without widening their grid track.',
        currency: 'EGP',
        visibility: index === sharedBucketIndex ? 'shared' : 'private',
        status: 'active',
        schemaVersion: 3,
        revision: 2,
        orderState: 'open',
        customItemMode: 'direct',
        pricingPolicy,
        frozenAt: null,
        frozenBy: null,
        items: [
          {
            id: `responsive-item-${index}`,
            name: 'A menu item with a long but valid responsive name',
            description: '',
            category: 'Main dishes',
            unitPrice: 42,
            active: true,
            sortOrder: 0,
          },
        ],
        aggregate: {},
        createdAt: timestamp(index),
        updatedAt: timestamp(index),
      }));
      const orders = seededBucketTitles.map((bucketTitle, index) => ({
        id: `responsive-order-${index}`,
        userId: owner.id,
        bucketId: `responsive-bucket-${index}`,
        bucketTitle,
        status: 'placed',
        currency: 'EGP',
        lines: [
          {
            id: `responsive-line-${index}`,
            bucketItemId: `responsive-item-${index}`,
            name: 'A menu item with a long but valid responsive name',
            quantity: 1,
            unitPrice: 42,
            lineTotal: 42,
          },
        ],
        notes: '',
        subtotal: 42,
        total: 42,
        sourceBucketRevision: 2,
        participants: null,
        createdAt: timestamp(index),
        updatedAt: timestamp(index),
        placedAt: timestamp(index),
        completedAt: null,
        cancelledAt: null,
      }));
      const sharedBucket = buckets[sharedBucketIndex];
      if (!sharedBucket)
        throw new Error('Responsive shared bucket was not seeded.');

      const ownerSocialUser = socialUser(owner);
      const memberSocialUser = socialUser(member);
      const activeMember = (profile: typeof owner, invitedBy: string) => ({
        ...socialUser(profile),
        status: 'active',
        invitedBy,
        invitedAt: now,
        respondedAt: now,
      });

      localStorage.setItem(
        databaseKey,
        JSON.stringify({
          users: {
            [owner.id]: { password: 'Password1', profile: owner },
            [member.id]: { password: 'Password1', profile: member },
          },
          buckets: { [owner.id]: buckets, [member.id]: [] },
          orders: { [owner.id]: orders, [member.id]: [] },
          sharing: {
            members: {
              [sharedBucket.id]: [
                {
                  userId: owner.id,
                  displayName: owner.fullName,
                  email: owner.email,
                  role: 'owner',
                  status: 'active',
                  canCreateCustomItems: true,
                  canSetCustomItemPrice: true,
                  invitedBy: owner.id,
                  joinedAt: now,
                  updatedAt: now,
                },
                {
                  userId: member.id,
                  displayName: member.fullName,
                  email: member.email,
                  role: 'editor',
                  status: 'active',
                  canCreateCustomItems: true,
                  canSetCustomItemPrice: true,
                  invitedBy: owner.id,
                  joinedAt: now,
                  updatedAt: now,
                },
              ],
            },
            invites: {},
            contributions: {},
            mutations: {},
            activity: { [sharedBucket.id]: [] },
          },
        }),
      );
      localStorage.setItem(
        socialKey,
        JSON.stringify({
          requests: [],
          friends: {
            [owner.id]: [memberSocialUser],
            [member.id]: [ownerSocialUser],
          },
          groups: [
            {
              id: 'responsive-group',
              ownerId: owner.id,
              name: groupName,
              description:
                'A long group description that must wrap instead of clipping controls or member metadata.',
              members: [
                activeMember(owner, owner.id),
                activeMember(member, owner.id),
              ],
              createdAt: now,
              updatedAt: now,
            },
          ],
          invitations: [],
          bucketInvitations: [],
          grants: [],
        }),
      );
      localStorage.setItem(sessionKey, owner.id);
    },
    {
      databaseKey: DATABASE_KEY,
      socialKey: SOCIAL_KEY,
      sessionKey: SESSION_KEY,
      now: NOW,
      ownerId: OWNER_ID,
      memberId: MEMBER_ID,
      bucketTitles,
      sharedBucketIndex: SHARED_BUCKET_INDEX,
      groupName: LONG_GROUP_NAME,
      memberName: LONG_MEMBER_NAME,
    },
  );
}

export async function switchResponsiveUser(
  page: Page,
  userId: string,
): Promise<void> {
  await page.evaluate(
    ({ sessionKey, nextUserId }) => {
      localStorage.setItem(sessionKey, nextUserId);
    },
    { sessionKey: SESSION_KEY, nextUserId: userId },
  );
}
