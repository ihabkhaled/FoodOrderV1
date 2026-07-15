import { expect, type Page, test } from '@playwright/test';

const DATABASE_KEY = 'foodorder:v1:database';
const SESSION_KEY = 'foodorder:v1:session';
const NOW = '2026-07-15T01:30:00.000Z';

interface StoredBucket {
  id: string;
  title: string;
  pricingPolicy?: {
    vatBasisPoints: number;
    serviceBasisPoints: number;
    deliveryMinor: number;
    vatAllocation: string;
    serviceAllocation: string;
    deliveryAllocation: string;
  };
}

const seedOwner = async (page: Page): Promise<void> => {
  await page.addInitScript(
    ({ databaseKey, sessionKey, now }) => {
      if (localStorage.getItem(databaseKey)) return;
      const owner = {
        id: 'owner-1',
        fullName: 'Pricing Owner',
        email: 'owner@example.com',
        locale: 'en',
        theme: 'system',
        defaultCurrency: 'EGP',
        createdAt: now,
        updatedAt: now,
      };
      localStorage.setItem(
        databaseKey,
        JSON.stringify({
          users: {
            [owner.id]: { password: 'Password1', profile: owner },
          },
          buckets: { [owner.id]: [] },
          orders: { [owner.id]: [] },
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
    },
    { databaseKey: DATABASE_KEY, sessionKey: SESSION_KEY, now: NOW },
  );
};

const readBuckets = async (page: Page): Promise<StoredBucket[]> =>
  page.evaluate((databaseKey) => {
    const database = JSON.parse(localStorage.getItem(databaseKey) ?? '{}') as {
      buckets?: Record<string, StoredBucket[]>;
    };
    return database.buckets?.['owner-1'] ?? [];
  }, DATABASE_KEY);

const expectedPricing = {
  vatBasisPoints: 1400,
  serviceBasisPoints: 1200,
  deliveryMinor: 2500,
  vatAllocation: 'proportional',
  serviceAllocation: 'proportional',
  deliveryAllocation: 'equal',
};

test.describe('v1.3.4 bucket-owned pricing', () => {
  test('private bucket create, duplicate, order, and share flows keep pricing', async ({
    page,
  }) => {
    await seedOwner(page);
    await page.goto('/buckets/new');

    await expect(page.getByLabel('VAT percentage')).toBeVisible();
    await expect(page.getByLabel('Service percentage')).toBeVisible();
    await expect(page.getByLabel('Delivery amount')).toBeVisible();

    await page.getByLabel('Bucket title').fill('Private pricing');
    await page.getByLabel('VAT percentage').fill('14');
    await page.getByLabel('Service percentage').fill('12');
    await page.getByLabel('Delivery amount').fill('25');
    await page.getByLabel('Item name').fill('Meal');
    await page.getByLabel('Unit price').fill('100');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).toHaveURL(/\/buckets$/u);

    await expect
      .poll(async () => {
        const storedBuckets = await readBuckets(page);
        const bucket = storedBuckets.find(
          (candidate) => candidate.title === 'Private pricing',
        );
        return bucket?.pricingPolicy;
      })
      .toEqual(expectedPricing);

    await page
      .getByRole('button', { name: 'Duplicate — Private pricing' })
      .click();
    await expect
      .poll(async () => {
        const storedBuckets = await readBuckets(page);
        return storedBuckets.length;
      })
      .toBe(2);
    const buckets = await readBuckets(page);
    const original = buckets.find((bucket) => bucket.title === 'Private pricing');
    const copied = buckets.find(
      (bucket) => bucket.title === 'Private pricing (copy)',
    );
    expect(original).toBeDefined();
    expect(copied?.pricingPolicy).toEqual(expectedPricing);
    const originalId = original?.id ?? '';
    expect(originalId).not.toBe('');

    await page.goto(`/buckets/${originalId}/edit`);
    await expect(page.getByLabel('VAT percentage')).toHaveValue('14');
    await expect(page.getByLabel('Service percentage')).toHaveValue('12');
    await expect(page.getByLabel('Delivery amount')).toHaveValue('25');

    await page.goto(`/buckets/${originalId}/share`);
    await expect(page.getByLabel('VAT percentage')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Enable sharing' })).toBeVisible();

    await page.goto(`/buckets/${originalId}/order`);
    await page.getByRole('button', { name: 'Increase Meal' }).click();
    const previewTotals = page.locator('.totals');
    await expect(previewTotals.getByText('EGP 100.00')).toBeVisible();
    await expect(previewTotals.getByText('EGP 14.00')).toBeVisible();
    await expect(previewTotals.getByText('EGP 12.00')).toBeVisible();
    await expect(previewTotals.getByText('EGP 25.00')).toBeVisible();
    await expect(previewTotals.getByText('EGP 151.00')).toBeVisible();

    await page.getByRole('button', { name: 'Place order' }).click();
    await expect(page).toHaveURL(/\/orders\/.+/u);
    const orderTotals = page.locator('.totals');
    await expect(orderTotals.getByText('EGP 100.00')).toBeVisible();
    await expect(orderTotals.getByText('EGP 14.00')).toBeVisible();
    await expect(orderTotals.getByText('EGP 12.00')).toBeVisible();
    await expect(orderTotals.getByText('EGP 25.00')).toBeVisible();
    await expect(orderTotals.getByText('EGP 151.00')).toBeVisible();
  });
});
