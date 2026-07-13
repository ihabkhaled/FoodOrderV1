import { expect, type Page,test } from '@playwright/test';

// UI/layout gate: proves the responsive shell places components correctly and
// nothing overflows horizontally. Runs against the deterministic local-device
// mode configured by playwright.config.ts.

const register = async (page: Page): Promise<void> => {
  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('UI Tester');
  await page.getByLabel('Email').fill(`ui-${Date.now()}-${Math.round(performance.now())}@example.com`);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/$/);
};

const expectNoHorizontalOverflow = async (page: Page): Promise<void> => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  // Allow 1px for sub-pixel rounding.
  expect(overflow, 'page must not scroll horizontally').toBeLessThanOrEqual(1);
};

test.describe('responsive shell', () => {
  test('desktop shows the sidebar and no bottom nav', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await register(page);
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.bottom-nav')).toBeHidden();
    await expect(page.locator('.sidebar .nav-link', { hasText: 'Buckets' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('mobile shows the bottom nav and top bar, hides the sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await register(page);
    await expect(page.locator('.bottom-nav')).toBeVisible();
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.locator('.sidebar')).toBeHidden();
    await expectNoHorizontalOverflow(page);
  });

  test('dashboard stat cards render value and label separately', async ({ page }) => {
    await register(page);
    const firstStat = page.locator('.stat-card').first();
    await expect(firstStat.locator('strong')).toBeVisible();
    await expect(firstStat.locator('span')).toBeVisible();
    // Value box and label box are distinct elements (not one glued string).
    await expect(page.locator('.stat-card')).toHaveCount(5);
  });

  test('the toast does not overlap the page heading', async ({ page }) => {
    await register(page); // triggers the "account ready" toast
    const toast = page.locator('.toast');
    await expect(toast).toBeVisible();
    const heading = page.locator('h1').first();
    const [toastBox, headingBox] = await Promise.all([toast.boundingBox(), heading.boundingBox()]);
    expect(toastBox).not.toBeNull();
    expect(headingBox).not.toBeNull();
    // Toast sits below the heading (bottom-anchored), never on top of it.
    expect(toastBox!.y).toBeGreaterThan(headingBox!.y + headingBox!.height);
  });
});

test.describe('instant sidebar controls', () => {
  test('theme toggle changes the document theme immediately', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await register(page);
    const root = page.locator('html');
    // Cycle system -> light -> dark; explicit dark forces data-theme regardless of OS.
    const themeButton = page.locator('.sidebar').getByRole('button', { name: /Theme:/ });
    await themeButton.click();
    await themeButton.click();
    await expect(root).toHaveAttribute('data-theme', 'dark');
    // ...and once more back to system (light under this emulation).
    await themeButton.click();
    await expect(root).toHaveAttribute('data-theme', 'light');
  });

  test('language toggle flips locale and direction immediately', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await register(page);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'ltr');
    await page.locator('.sidebar').getByRole('button', { name: /العربية/ }).click();
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(html).toHaveAttribute('lang', 'ar');
  });

  test('collapsing the sidebar narrows the shell and persists', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await register(page);
    const shell = page.locator('.app-shell');
    await expect(shell).not.toHaveClass(/collapsed/);
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(shell).toHaveClass(/collapsed/);
    // Persisted: after reload the sidebar is still collapsed.
    await page.reload();
    await expect(page.locator('.app-shell')).toHaveClass(/collapsed/);
  });
});
