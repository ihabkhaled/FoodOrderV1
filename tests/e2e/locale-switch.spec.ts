import { expect, type Page, test } from '@playwright/test';

import { suppressFeatureTours } from './helpers/featureTours';

test.beforeEach(async ({ page }) => {
  await suppressFeatureTours(page);
});

const preferencesLanguageSelect = (page: Page) =>
  page.locator('main select').first();

const persistedLocale = async (page: Page): Promise<string | null> =>
  page.evaluate(() => {
    const sessionUserId = localStorage.getItem('foodorder:v1:session');
    const raw = localStorage.getItem('foodorder:v1:database');
    if (!sessionUserId || !raw) return null;
    const database = JSON.parse(raw) as {
      users?: Record<string, { profile?: { locale?: string } }>;
    };
    return database.users?.[sessionUserId]?.profile?.locale ?? null;
  });

const saveLanguagePreference = async (
  page: Page,
  locale: 'ar' | 'ar-Latn',
): Promise<void> => {
  await page.goto('/settings/preferences');
  const select = preferencesLanguageSelect(page);
  await expect(select).toBeVisible();
  await select.selectOption(locale);
  await page.locator('.sticky-actions button').click();

  await expect.poll(async () => persistedLocale(page)).toBe(locale);
};

const register = async (page: Page, suffix: string): Promise<void> => {
  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('Locale Tester');
  await page.getByLabel('Email').fill(`locale-${suffix}-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/app$/u);
};

const expectDocumentLocale = async (
  page: Page,
  locale: string,
  direction: 'ltr' | 'rtl',
): Promise<void> => {
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', direction);
};

test.describe('switching the app language', () => {
  test('keeps Arabic Franco through a reload', async ({ page }) => {
    await register(page, 'franco');
    await saveLanguagePreference(page, 'ar-Latn');

    await page.goto('/ar-latn/app');
    await expectDocumentLocale(page, 'ar-Latn', 'ltr');
    await page.reload();
    await expectDocumentLocale(page, 'ar-Latn', 'ltr');

    await page.goto('/ar-latn/settings/preferences');
    await expect(preferencesLanguageSelect(page)).toHaveValue('ar-Latn');
  });

  test('still separates Arabic from Arabic Franco', async ({ page }) => {
    await register(page, 'arabic');
    await saveLanguagePreference(page, 'ar');

    await page.goto('/ar/app');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expectDocumentLocale(page, 'ar', 'rtl');

    await saveLanguagePreference(page, 'ar-Latn');
    await page.goto('/ar-latn/app');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar-Latn');
    await expectDocumentLocale(page, 'ar-Latn', 'ltr');
    await page.reload();
    await expectDocumentLocale(page, 'ar-Latn', 'ltr');
  });
});
