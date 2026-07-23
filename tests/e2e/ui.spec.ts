import { expect, type Locator, type Page, test } from '@playwright/test';

// UI/layout gate: proves the responsive shell places components correctly and
// nothing overflows horizontally. Runs against the deterministic local-device
// mode configured by playwright.config.ts.

const register = async (page: Page): Promise<void> => {
  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('UI Tester');
  await page
    .getByLabel('Email')
    .fill(`ui-${Date.now()}-${Math.round(performance.now())}@example.com`);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/app$/u);
};

const expectNoHorizontalOverflow = async (page: Page): Promise<void> => {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  // Allow 1px for sub-pixel rounding.
  expect(overflow, 'page must not scroll horizontally').toBeLessThanOrEqual(1);
};

const requireBox = async (locator: Locator, label: string) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`${label} must be measurable.`);
  return box;
};

const expectCenteredWithin = async (
  inner: Locator,
  outer: Locator,
  tolerance = 2,
): Promise<void> => {
  const [innerBox, outerBox] = await Promise.all([
    requireBox(inner, 'Centered element'),
    requireBox(outer, 'Containing element'),
  ]);

  const horizontalOffset = Math.abs(
    innerBox.x + innerBox.width / 2 - (outerBox.x + outerBox.width / 2),
  );
  const verticalOffset = Math.abs(
    innerBox.y + innerBox.height / 2 - (outerBox.y + outerBox.height / 2),
  );

  expect(horizontalOffset).toBeLessThanOrEqual(tolerance);
  expect(verticalOffset).toBeLessThanOrEqual(tolerance);
};

const expectHorizontallyCenteredWithin = async (
  inner: Locator,
  outer: Locator,
  tolerance = 2,
): Promise<void> => {
  const [innerBox, outerBox] = await Promise.all([
    requireBox(inner, 'Centered element'),
    requireBox(outer, 'Containing element'),
  ]);

  const horizontalOffset = Math.abs(
    innerBox.x + innerBox.width / 2 - (outerBox.x + outerBox.width / 2),
  );
  expect(horizontalOffset).toBeLessThanOrEqual(tolerance);
};

test.describe('signed-out shell controls', () => {
  test('mobile auth controls stay compact, aligned, and functional', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/auth/login');

    const controls = page.locator('.auth-controls');
    const languageSelect = controls.locator('select');
    const themeButton = controls.locator('.auth-control-button');
    await expect(controls).toBeVisible();
    await expect(languageSelect).toHaveCount(1);
    await expect(themeButton).toHaveCount(1);

    const [languageBox, themeBox, controlsBox] = await Promise.all([
      requireBox(languageSelect, 'Language selector'),
      requireBox(themeButton, 'Theme button'),
      requireBox(controls, 'Auth controls'),
    ]);

    expect(languageBox.width).toBeGreaterThanOrEqual(120);
    expect(languageBox.height).toBeGreaterThanOrEqual(44);
    expect(languageBox.height).toBeLessThanOrEqual(48);
    expect(themeBox.width).toBe(44);
    expect(themeBox.height).toBe(44);
    expect(Math.abs(languageBox.y - themeBox.y)).toBeLessThanOrEqual(1);
    expect(controlsBox.width).toBeLessThanOrEqual(210);

    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'ltr');
    await languageSelect.selectOption('it');
    await expect(html).toHaveAttribute('lang', 'it');
    await expect(html).toHaveAttribute('dir', 'ltr');
    await languageSelect.selectOption('fa');
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(html).toHaveAttribute('lang', 'fa');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await page.locator('.auth-controls select').selectOption('de');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');

    await page.locator('.auth-control-button').click();
    await page.locator('.auth-control-button').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('responsive shell', () => {
  test('desktop shows the sidebar and no bottom nav', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await register(page);
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.bottom-nav')).toBeHidden();
    await expect(
      page.locator('.sidebar .nav-link', { hasText: 'Buckets' }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('mobile shows the bottom nav and top bar, hides the sidebar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await register(page);
    await expect(page.locator('.bottom-nav')).toBeVisible();
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.locator('.sidebar')).toBeHidden();
    await expectNoHorizontalOverflow(page);
  });

  test('dashboard stat cards render value and label separately', async ({
    page,
  }) => {
    await register(page);
    const firstStat = page.locator('.stat-card').first();
    await expect(firstStat.locator('strong')).toBeVisible();
    await expect(firstStat.locator('span')).toBeVisible();
    // Six clickable destination tiles; value and label remain distinct elements.
    await expect(page.locator('.stat-card')).toHaveCount(6);
  });

  test('loading presentation is centered horizontally and vertically', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await register(page);

    await page.locator('.refresh-viewport').evaluate((viewport) => {
      const loading = document.createElement('div');
      loading.className = 'loading';
      loading.setAttribute('role', 'status');
      loading.setAttribute('aria-label', 'Loading layout fixture');

      const orbit = document.createElement('span');
      orbit.className = 'loading-orbit';
      orbit.setAttribute('aria-hidden', 'true');

      const copy = document.createElement('span');
      copy.className = 'loading-copy';
      const label = document.createElement('strong');
      label.textContent = 'Loading...';
      copy.append(label);

      const skeleton = document.createElement('span');
      skeleton.className = 'loading-skeleton';
      skeleton.setAttribute('aria-hidden', 'true');
      for (let index = 0; index < 3; index += 1) {
        skeleton.append(document.createElement('span'));
      }

      loading.append(orbit, copy, skeleton);
      viewport.replaceChildren(loading);
    });

    const viewport = page.locator('.refresh-viewport');
    const loading = viewport.getByRole('status', {
      name: 'Loading layout fixture',
    });
    await expect(loading).toBeVisible();
    await expectCenteredWithin(loading, viewport);

    const skeleton = loading.locator('.loading-skeleton');
    const firstBar = skeleton.locator('span').first();
    await expectHorizontallyCenteredWithin(firstBar, skeleton);
  });

  test('the toast does not overlap the page heading', async ({ page }) => {
    await register(page); // triggers the "account ready" toast
    const toast = page.locator('.toast');
    await expect(toast).toBeVisible();
    const heading = page.locator('h1').first();
    const [toastBox, headingBox] = await Promise.all([
      toast.boundingBox(),
      heading.boundingBox(),
    ]);
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
    const themeButton = page
      .locator('.sidebar')
      .getByRole('button', { name: /Theme:/u });
    await themeButton.click();
    await themeButton.click();
    await expect(root).toHaveAttribute('data-theme', 'dark');
    // ...and once more back to system (light under this emulation).
    await themeButton.click();
    await expect(root).toHaveAttribute('data-theme', 'light');
  });

  test('language selector applies and persists RTL and LTR locales', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await register(page);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'ltr');
    await page.locator('.sidebar .shell-language-select').selectOption('it');
    await expect(html).toHaveAttribute('lang', 'it');
    await expect(html).toHaveAttribute('dir', 'ltr');
    await page.locator('.sidebar .shell-language-select').selectOption('fa');
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(html).toHaveAttribute('lang', 'fa');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await page.locator('.sidebar .shell-language-select').selectOption('de');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  });

  test('collapsing the sidebar narrows the shell and persists', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await register(page);
    const shell = page.locator('.app-shell');
    await expect(shell).not.toHaveClass(/collapsed/u);
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(shell).toHaveClass(/collapsed/u);
    // Persisted: after reload the sidebar is still collapsed.
    await page.reload();
    await expect(page.locator('.app-shell')).toHaveClass(/collapsed/u);
  });
});
