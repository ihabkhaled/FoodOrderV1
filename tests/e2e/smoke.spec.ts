import { expect, test } from '@playwright/test';

import { suppressFeatureTours } from './helpers/featureTours';

test.beforeEach(async ({ page }) => {
  await suppressFeatureTours(page);
});

test('register, create bucket and complete the guided order flow', async ({
  page,
}) => {
  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('Demo User');
  await page.getByLabel('Email').fill(`demo-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Create account' }).click();

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
