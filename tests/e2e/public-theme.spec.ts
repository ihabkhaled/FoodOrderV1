import { expect, type Page, test } from '@playwright/test';

const LIGHT_BODY = 'rgb(255, 250, 243)';
const DARK_BODY = 'rgb(11, 18, 16)';

const bodyBackground = (page: Page): Promise<string> =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe('public light and dark switch', () => {
  test.use({ colorScheme: 'light' });

  test('switches to dark and remembers it across pages', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('body')).toBeVisible();
    expect(await bodyBackground(page)).toBe(LIGHT_BODY);

    const toggle = page.locator('[data-public-theme-toggle]');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();

    expect(await bodyBackground(page)).toBe(DARK_BODY);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    // The choice is applied before first paint on the next document, so the
    // reader never sees the wrong palette flash.
    await page.goto('/en/about');
    expect(await bodyBackground(page)).toBe(DARK_BODY);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('public switch against a dark operating system', () => {
  test.use({ colorScheme: 'dark' });

  test('an explicit light choice overrides the system preference', async ({
    page,
  }) => {
    await page.goto('/de');
    expect(await bodyBackground(page)).toBe(DARK_BODY);

    await page.locator('[data-public-theme-toggle]').click();
    expect(await bodyBackground(page)).toBe(LIGHT_BODY);

    await page.reload();
    expect(await bodyBackground(page)).toBe(LIGHT_BODY);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
