import { expect, type Page, test } from '@playwright/test';

import { suppressFeatureTours } from './helpers/featureTours';

test.beforeEach(async ({ page }) => {
  await suppressFeatureTours(page);
});

const visibleShellLanguageSelect = (page: Page) =>
  page.locator('select.shell-language-select:visible').first();

const preferencesLanguageSelect = (page: Page) =>
  page.locator('main select').first();

const selectLanguage = async (page: Page, locale: string): Promise<void> => {
  const shellSelect = visibleShellLanguageSelect(page);
  if (await shellSelect.isVisible().catch(() => false)) {
    await shellSelect.selectOption(locale);
    return;
  }

  await page.goto('/settings/preferences');
  await preferencesLanguageSelect(page).selectOption(locale);
  await page.locator('.sticky-actions button').click();
};

const assertSavedLanguage = async (page: Page, locale: string): Promise<void> => {
  const shellSelect = visibleShellLanguageSelect(page);
  if (await shellSelect.isVisible().catch(() => false)) {
    await expect(shellSelect).toHaveValue(locale);
    return;
  }

  await page.goto('/settings/preferences');
  await expect(preferencesLanguageSelect(page)).toHaveValue(locale);
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

/**
 * Preference save updates runtime/profile state; it does not guarantee a
 * navigation event. These regressions therefore assert the actual document
 * locale, then visit the localized route explicitly to prove persistence.
 */
test.describe('switching the app language', () => {
  test('keeps Arabic Franco through a reload', async ({ page }) => {
    await register(page, 'franco');

    await selectLanguage(page, 'ar-Latn');
    await expectDocumentLocale(page, 'ar-Latn', 'ltr');

    await page.goto('/ar-latn/app');
    await page.reload();
    await expectDocumentLocale(page, 'ar-Latn', 'ltr');
    await assertSavedLanguage(page, 'ar-Latn');
  });

  test('still separates Arabic from Arabic Franco', async ({ page }) => {
    await register(page, 'arabic');

    await selectLanguage(page, 'ar');
    await expectDocumentLocale(page, 'ar', 'rtl');

    await page.goto('/ar/app');
    await selectLanguage(page, 'ar-Latn');
    await expectDocumentLocale(page, 'ar-Latn', 'ltr');

    await page.goto('/ar-latn/app');
    await page.reload();
    await expectDocumentLocale(page, 'ar-Latn', 'ltr');
  });
});
