import { expect, type Page, test } from '@playwright/test';

import { suppressFeatureTours } from './helpers/featureTours';

const register = async (page: Page, suffix: string): Promise<void> => {
  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('New Guy');
  await page.getByLabel('Email').fill(`first-run-${suffix}-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/app$/u);
};

test.beforeEach(async ({ page }) => {
  await suppressFeatureTours(page);
});

test('a brand-new account sees a first-menu welcome, not a returning-user one', async ({
  page,
}) => {
  await register(page, 'new');

  await expect(page.getByText('Welcome!', { exact: true })).toBeVisible();
  await expect(
    page.getByText("Let's create your first menu", { exact: false }),
  ).toBeVisible();
  // "Welcome back" describes someone who has done this before; a person who
  // just registered has closed nothing, so it must not appear alongside the
  // new-user greeting.
  await expect(page.getByText('Welcome back')).toHaveCount(0);
});

test('creating the first menu switches the dashboard to the returning-user welcome', async ({
  page,
}) => {
  await register(page, 'graduated');

  await page.getByRole('link', { name: 'Create menu' }).click();
  await page.getByLabel('Menu name').fill('My First Menu');
  await page.getByLabel('Item name').fill('Coffee');
  await page.getByLabel('Unit price').fill('5');
  await page.getByRole('button', { name: 'Save' }).click();

  await page.goto('/app');
  await expect(page.getByText('Welcome back', { exact: true })).toBeVisible();
  await expect(page.getByText('Welcome!', { exact: true })).toHaveCount(0);
});
