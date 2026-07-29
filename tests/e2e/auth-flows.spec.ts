import { expect, type Page, test } from '@playwright/test';

const register = async (page: Page, suffix: string): Promise<void> => {
  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('Auth Flow Tester');
  await page
    .getByLabel('Email')
    .fill(`auth-flows-${suffix}-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/app$/u);
};

test.describe('logout confirmation', () => {
  test('cancelling the dialog keeps the session active', async ({ page }) => {
    await register(page, 'cancel');

    await page.locator('button[aria-label="Log out"]:visible').first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: 'Log out?' }),
    ).toBeVisible();

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/app$/u);
  });

  test('confirming the dialog signs out to the login screen', async ({
    page,
  }) => {
    await register(page, 'confirm');

    await page.locator('button[aria-label="Log out"]:visible').first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Log out' }).click();

    await page.waitForURL(/\/auth\/login/u);
  });
});
