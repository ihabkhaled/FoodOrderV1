import { expect, type Page, test } from '@playwright/test';

const register = async (page: Page, suffix: string): Promise<string> => {
  const email = `auth-flows-${suffix}-${Date.now()}@example.com`;
  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('Auth Flow Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/app$/u);
  return email;
};

/** Simulates opening the app on a fresh device that shares the same backend. */
const clearDeviceState = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    localStorage.removeItem('foodorder:v1:session');
    localStorage.removeItem('CapacitorStorage.theme');
    localStorage.removeItem('CapacitorStorage.locale');
  });
};

const login = async (page: Page, email: string): Promise<void> => {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Log in' }).click();
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

test.describe('preference persistence across devices', () => {
  test('a saved dark theme is restored after logging in on a fresh device', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 1280, height: 900 });
    const email = await register(page, 'theme');

    const themeButton = page
      .locator('.sidebar')
      .getByRole('button', { name: /Theme:/u });
    await themeButton.click();
    await themeButton.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await clearDeviceState(page);
    await page.reload();
    await page.waitForURL(/\/auth\/login/u);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await login(page, email);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('a saved language is restored after logging in on a fresh device', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const email = await register(page, 'locale');

    await page.locator('.sidebar .shell-language-select').selectOption('ar');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    await clearDeviceState(page);
    await login(page, email);

    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('the system theme follows live OS colour-scheme changes', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await register(page, 'system-theme');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
