import { expect, type Page, test } from '@playwright/test';

const DATABASE_KEY = 'foodorder:v1:database';
const SESSION_KEY = 'foodorder:v1:session';
const NOW = '2026-07-14T12:00:00.000Z';

interface SeedOptions {
  sessionUserId: string;
  includeContribution: boolean;
  editorWithoutCustomPermissions?: boolean;
}

const seedGroupOrder = async (
  page: Page,
  options: SeedOptions,
): Promise<void> => {
  await page.addInitScript(
    ({ databaseKey, sessionKey, now, seed }) => {
      const owner = {
        id: 'owner-1',
        fullName: 'Order Owner',
        email: 'owner@example.com',
        locale: 'en',
        theme: 'system',
        defaultCurrency: 'EGP',
        createdAt: now,
        updatedAt: now,
      };
      const editor = {
        id: 'editor-1',
        fullName: 'Legacy Editor',
        email: 'editor@example.com',
        locale: 'en',
        theme: 'system',
        defaultCurrency: 'EGP',
        createdAt: now,
        updatedAt: now,
      };
      const bucket = {
        id: 'bucket-1',
        ownerId: owner.id,
        ownerName: owner.fullName,
        title: 'Regression Lunch',
        description: 'Critical group-order flow',
        currency: 'EGP',
        visibility: 'shared',
        status: 'active',
        schemaVersion: 2,
        revision: 2,
        items: [
          {
            id: 'item-1',
            name: 'Falafel',
            description: '',
            category: 'Lunch',
            unitPrice: 10,
            active: true,
            sortOrder: 0,
            createdByUserId: owner.id,
            createdByName: owner.fullName,
            source: 'catalog',
            approvalStatus: 'approved',
          },
        ],
        aggregate: seed.includeContribution ? { 'item-1': 2 } : {},
        createdAt: now,
        updatedAt: now,
      };
      const editorMember = {
        userId: editor.id,
        displayName: editor.fullName,
        email: editor.email,
        role: 'editor',
        status: 'active',
        invitedBy: owner.id,
        joinedAt: now,
        updatedAt: now,
        ...(seed.editorWithoutCustomPermissions
          ? {}
          : {
              canCreateCustomItems: true,
              canSetCustomItemPrice: true,
            }),
      };
      const database = {
        users: {
          [owner.id]: { password: 'Password1', profile: owner },
          [editor.id]: { password: 'Password1', profile: editor },
        },
        buckets: {
          [owner.id]: [bucket],
          [editor.id]: [],
        },
        orders: {
          [owner.id]: [],
          [editor.id]: [],
        },
        sharing: {
          members: {
            [bucket.id]: [
              {
                userId: owner.id,
                displayName: owner.fullName,
                email: owner.email,
                role: 'owner',
                status: 'active',
                invitedBy: owner.id,
                joinedAt: now,
                updatedAt: now,
              },
              editorMember,
            ],
          },
          invites: {},
          contributions: seed.includeContribution
            ? {
                [bucket.id]: [
                  {
                    bucketId: bucket.id,
                    userId: owner.id,
                    displayName: owner.fullName,
                    quantities: { 'item-1': 2 },
                    revision: 1,
                    lastMutationId: 'seed-mutation',
                    updatedAt: now,
                  },
                ],
              }
            : {},
          mutations: {},
          activity: {},
        },
      };
      localStorage.setItem(databaseKey, JSON.stringify(database));
      localStorage.setItem(sessionKey, seed.sessionUserId);
    },
    {
      databaseKey: DATABASE_KEY,
      sessionKey: SESSION_KEY,
      now: NOW,
      seed: options,
    },
  );
};

test.describe('critical group-order regressions', () => {
  test('owner can place a populated group order and open its receipt', async ({
    page,
  }) => {
    await seedGroupOrder(page, {
      sessionUserId: 'owner-1',
      includeContribution: true,
    });
    await page.goto('/buckets/bucket-1/collaborate');

    await page.getByRole('button', { name: 'Place group order' }).click();

    await expect(page).toHaveURL(/\/orders\/.+/);
    await expect(
      page.getByRole('heading', { name: 'Regression Lunch' }),
    ).toBeVisible();
    await expect(page.getByText('2 × Falafel')).toBeVisible();
  });

  test('legacy editor membership still exposes custom-item creation', async ({
    page,
  }) => {
    await seedGroupOrder(page, {
      sessionUserId: 'editor-1',
      includeContribution: false,
      editorWithoutCustomPermissions: true,
    });
    await page.goto('/buckets/bucket-1/collaborate');

    await expect(page.getByLabel('Custom item name')).toBeVisible();
    await expect(page.getByLabel('Custom item price')).toBeEnabled();
    await expect(
      page.getByRole('button', { name: 'Propose custom item' }),
    ).toBeVisible();
  });

  test('place-order action remains disabled until a quantity exists', async ({
    page,
  }) => {
    await seedGroupOrder(page, {
      sessionUserId: 'owner-1',
      includeContribution: false,
    });
    await page.goto('/buckets/bucket-1/collaborate');

    await expect(
      page.getByRole('button', { name: 'Place group order' }),
    ).toBeDisabled();
  });
});
