import { expect, type Page, test } from '@playwright/test';

import { suppressFeatureTours } from './helpers/featureTours';

const register = async (page: Page): Promise<void> => {
  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('Demo User');
  await page.getByLabel('Email').fill(`demo-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Create account' }).click();
};

test.beforeEach(async ({ page }) => {
  await suppressFeatureTours(page);
});

test('register, create bucket and complete the guided order flow', async ({
  page,
}) => {
  await register(page);

  await page.getByRole('link', { name: 'Create bucket' }).click();
  await page.getByLabel('Bucket title').fill('Breakfast');
  await page.getByLabel('Item name').fill('Foul');
  await page.getByLabel('Unit price').fill('20');
  await page.getByRole('button', { name: 'Save' }).click();

  await page.getByRole('link', { name: 'Order now' }).click();
  await page.getByRole('button', { name: 'Increase Foul' }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByLabel('Notes')).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Place order' })).toBeVisible();
  await page.getByRole('button', { name: 'Place order' }).click();

  await expect(page.getByText('Order details')).toBeVisible();
});

test('recent item suggestion fills the item and moves focus to price', async ({
  page,
}) => {
  await register(page);

  await page.getByRole('link', { name: 'Create bucket' }).click();
  await page.getByLabel('Bucket title').fill('History source');
  await page.getByLabel('Item name').fill('Fries');
  await page.getByLabel('Unit price').fill('15');
  await page.getByRole('button', { name: 'Save' }).click();

  await page.goto('/buckets');
  await page.getByRole('link', { name: 'Create bucket' }).click();
  const itemName = page.getByLabel('Item name');
  await itemName.focus();
  await page.getByRole('option', { name: /Fries/u }).click();

  await expect(itemName).toHaveValue('Fries');
  await expect(page.getByLabel('Unit price')).toBeFocused();
  await expect(page.getByLabel('Unit price')).toHaveValue('15');
});

test('review can open a collecting order session for friends', async ({ page }) => {
  await register(page);

  await page.getByRole('link', { name: 'Create bucket' }).click();
  await page.getByLabel('Bucket title').fill('Friends lunch');
  await page.getByLabel('Item name').fill('Burger');
  await page.getByLabel('Unit price').fill('50');
  await page.getByRole('button', { name: 'Save' }).click();

  await page.getByRole('link', { name: 'Order now' }).click();
  await page.getByRole('button', { name: 'Increase Burger' }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Open for friends' }).click();

  await expect(page).toHaveURL(/\/sessions\/session_[\w-]+$/u);
  await expect(page.getByText('Collecting')).toBeVisible();
});
