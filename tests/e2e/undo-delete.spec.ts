import { expect, type Page, test } from '@playwright/test';

import { suppressFeatureTours } from './helpers/featureTours';

const register = async (page: Page, suffix: string): Promise<void> => {
  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('Undo Tester');
  await page.getByLabel('Email').fill(`undo-${suffix}-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/app$/u);
};

const createMenu = async (page: Page, title: string): Promise<void> => {
  await page.goto('/buckets/new');
  await page.getByLabel('Menu name').fill(title);
  await page.getByLabel('Item name').fill('Falafel');
  await page.getByLabel('Unit price').fill('6');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForURL(/\/buckets\/[^/]+\/social-share$/u);
};

test.beforeEach(async ({ page }) => {
  await suppressFeatureTours(page);
});

test('deleting a menu can be undone before it actually deletes', async ({
  page,
}) => {
  await register(page, 'menu');
  await createMenu(page, 'Undo Menu');

  await page.goto('/buckets?scope=owned');
  await expect(
    page.getByRole('heading', { name: 'Undo Menu', exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Delete — Undo Menu' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();

  // Gone from the list immediately - the delete has not actually happened
  // yet, so this proves the hide is optimistic, not a reload after a write.
  await expect(
    page.getByRole('heading', { name: 'Undo Menu', exact: true }),
  ).toHaveCount(0);

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Undone.')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Undo Menu', exact: true }),
  ).toBeVisible();

  // A reload proves the menu was never actually deleted server-side.
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Undo Menu', exact: true }),
  ).toBeVisible();
});

test('letting the undo window pass actually deletes the menu', async ({
  page,
}) => {
  await register(page, 'expire');
  await createMenu(page, 'Expiring Menu');

  await page.goto('/buckets?scope=owned');
  await page.getByRole('button', { name: 'Delete — Expiring Menu' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Expiring Menu', exact: true }),
  ).toHaveCount(0);

  // The toast (and the window it represents) clears on its own; no click.
  await expect(page.locator('.toast')).toHaveCount(0, { timeout: 8000 });

  await page.reload();
  await expect(page.getByText('No menus yet')).toBeVisible();
});
