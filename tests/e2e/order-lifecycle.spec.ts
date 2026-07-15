import { expect, type Page, test } from '@playwright/test';

const DATABASE_KEY = 'foodorder:v1:database';
const SESSION_KEY = 'foodorder:v1:session';
const NOW = '2026-07-15T00:49:00.000Z';

const seedOrder = async (page: Page, sessionUserId: string): Promise<void> => {
  await page.addInitScript(
    ({ databaseKey, sessionKey, now, userId }) => {
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
        fullName: 'Order Editor',
        email: 'editor@example.com',
        locale: 'en',
        theme: 'system',
        defaultCurrency: 'EGP',
        createdAt: now,
        updatedAt: now,
      };
      const pricingPolicy = {
        vatBasisPoints: 1400,
        serviceBasisPoints: 1200,
        deliveryMinor: 2500,
        vatAllocation: 'proportional',
        serviceAllocation: 'proportional',
        deliveryAllocation: 'equal',
      };
      const bucket = {
        id: 'bucket-1',
        ownerId: owner.id,
        ownerName: owner.fullName,
        title: 'Bashandy',
        description: '',
        currency: 'EGP',
        visibility: 'shared',
        status: 'active',
        schemaVersion: 3,
        revision: 4,
        orderState: 'ordered',
        customItemMode: 'direct',
        pricingPolicy,
        frozenAt: now,
        frozenBy: owner.id,
        items: [
          {
            id: 'item-1',
            name: 'Fool',
            description: '',
            category: '',
            unitPrice: 10,
            active: true,
            sortOrder: 0,
          },
          {
            id: 'item-2',
            name: 'Ta3mya',
            description: '',
            category: '',
            unitPrice: 5,
            active: true,
            sortOrder: 1,
          },
        ],
        aggregate: { 'item-1': 2, 'item-2': 3 },
        createdAt: now,
        updatedAt: now,
      };
      const receipt = {
        currency: 'EGP',
        itemSubtotalMinor: 3500,
        vatMinor: 490,
        serviceMinor: 420,
        deliveryMinor: 2500,
        grandTotalMinor: 6910,
        participantReceipts: [
          {
            userId: owner.id,
            displayName: owner.fullName,
            lines: [
              {
                itemId: 'item-1',
                itemName: 'Fool',
                quantity: 2,
                unitPriceMinor: 1000,
                lineTotalMinor: 2000,
                createdByUserId: owner.id,
                createdByName: owner.fullName,
              },
              {
                itemId: 'item-2',
                itemName: 'Ta3mya',
                quantity: 3,
                unitPriceMinor: 500,
                lineTotalMinor: 1500,
                createdByUserId: owner.id,
                createdByName: owner.fullName,
              },
            ],
            itemSubtotalMinor: 3500,
            vatShareMinor: 490,
            serviceShareMinor: 420,
            deliveryShareMinor: 2500,
            totalMinor: 6910,
          },
        ],
        items: [],
        pricingPolicy,
        bucketRevision: 4,
      };
      const ownerOrder = {
        id: 'order-1',
        userId: owner.id,
        bucketId: bucket.id,
        bucketTitle: bucket.title,
        status: 'placed',
        currency: 'EGP',
        lines: [
          {
            id: 'line-1',
            bucketItemId: 'item-1',
            name: 'Fool',
            quantity: 2,
            unitPrice: 10,
            lineTotal: 20,
          },
          {
            id: 'line-2',
            bucketItemId: 'item-2',
            name: 'Ta3mya',
            quantity: 3,
            unitPrice: 5,
            lineTotal: 15,
          },
        ],
        notes: '',
        subtotal: 35,
        total: 69.1,
        sourceBucketRevision: 4,
        participants: [
          {
            userId: owner.id,
            displayName: owner.fullName,
            quantities: { 'item-1': 2, 'item-2': 3 },
          },
        ],
        groupReceipt: receipt,
        createdAt: now,
        updatedAt: now,
        placedAt: now,
        completedAt: null,
        cancelledAt: null,
      };
      const editorOrder = {
        ...ownerOrder,
        userId: editor.id,
      };
      const database = {
        users: {
          [owner.id]: { password: 'Password1', profile: owner },
          [editor.id]: { password: 'Password1', profile: editor },
        },
        buckets: { [owner.id]: [bucket], [editor.id]: [] },
        orders: { [owner.id]: [ownerOrder], [editor.id]: [editorOrder] },
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
              {
                userId: editor.id,
                displayName: editor.fullName,
                email: editor.email,
                role: 'editor',
                status: 'active',
                invitedBy: owner.id,
                joinedAt: now,
                updatedAt: now,
              },
            ],
          },
          invites: {},
          contributions: {},
          mutations: {},
          activity: {},
        },
      };
      localStorage.setItem(databaseKey, JSON.stringify(database));
      localStorage.setItem(sessionKey, userId);
    },
    {
      databaseKey: DATABASE_KEY,
      sessionKey: SESSION_KEY,
      now: NOW,
      userId: sessionUserId,
    },
  );
};

test.describe('v1.3.3 group-order lifecycle regressions', () => {
  test('owner sees all charges below subtotal and can complete the order', async ({
    page,
  }) => {
    await seedOrder(page, 'owner-1');
    await page.goto('/orders/order-1');

    const totals = page.locator('.totals');
    await expect(totals.getByText('VAT')).toBeVisible();
    await expect(totals.getByText('Service')).toBeVisible();
    await expect(totals.getByText('Delivery')).toBeVisible();
    await expect(totals.getByText('EGP 4.90')).toBeVisible();
    await expect(totals.getByText('EGP 4.20')).toBeVisible();
    await expect(totals.getByText('EGP 25.00')).toBeVisible();

    await page.getByRole('button', { name: 'Mark completed' }).click();
    await expect(page.getByText(/completed/iu)).toBeVisible();
  });

  test('active editor can cancel a shared group order', async ({ page }) => {
    await seedOrder(page, 'editor-1');
    await page.goto('/orders/order-1');

    await page.getByRole('button', { name: 'Cancel order' }).click();
    await expect(page.getByText(/cancelled/iu)).toBeVisible();
  });

  test('repeat preserves the exact name and all pricing charges', async ({ page }) => {
    await seedOrder(page, 'owner-1');
    await page.goto('/orders/order-1');

    await page.getByRole('button', { name: 'Repeat order' }).click();
    await expect(page).toHaveURL(/\/orders\/(?!order-1).+/u);
    await expect(page.getByRole('heading', { name: 'Bashandy' })).toBeVisible();
    await expect(page.getByText('Bashandy (copy)')).toHaveCount(0);
    const totals = page.locator('.totals');
    await expect(totals.getByText('EGP 4.90')).toBeVisible();
    await expect(totals.getByText('EGP 4.20')).toBeVisible();
    await expect(totals.getByText('EGP 25.00')).toBeVisible();
  });
});
