import { expect, type Page, test } from '@playwright/test';

import { suppressFeatureTours } from './helpers/featureTours';

test.beforeEach(async ({ page }) => {
  await suppressFeatureTours(page);
});

/** The shell renders one selector per breakpoint; drive whichever is shown. */
const languageSelect = (page: Page) =>
  page.locator('select.shell-language-select:visible').first();

const register = async (page: Page, suffix: string): Promise<void> => {
  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('Locale Tester');
  await page.getByLabel('Email').fill(`locale-${suffix}-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/app$/u);
};

/**
 * Arabic Franco uses a two-part segment (`/ar-latn`). A prefix matcher that
 * only knew the single-part locales matched `ar`, rejected the `-latn` tail,
 * and silently sent the reader back to English on the next load — so these
 * tests follow the switch all the way through a reload.
 */
test.describe('switching the app language', () => {
  test('keeps Arabic Franco through the redirect and a reload', async ({
    page,
  }) => {
    await register(page, 'franco');

    await languageSelect(page).selectOption('ar-Latn');

    await page.waitForURL(/\/ar-latn\/app$/u);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar-Latn');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    await page.reload();
    await page.waitForURL(/\/ar-latn\/app$/u);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar-Latn');
    await expect(languageSelect(page)).toHaveValue('ar-Latn');
  });

  test('still separates Arabic from Arabic Franco', async ({ page }) => {
    await register(page, 'arabic');

    await languageSelect(page).selectOption('ar');
    await page.waitForURL(/\/ar\/app$/u);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    await languageSelect(page).selectOption('ar-Latn');
    await page.waitForURL(/\/ar-latn\/app$/u);
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });
});
