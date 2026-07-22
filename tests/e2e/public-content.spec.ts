import { expect, test } from '@playwright/test';

test('public navigation serves unique crawler metadata through real links', async ({
  page,
}) => {
  // Pin a desktop viewport so the header links are rendered inline.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Collect group food orders without chasing messages',
    }),
  ).toBeVisible();

  await page
    .locator('.public-navigation--desktop')
    .getByRole('link', { name: 'About' })
    .click();
  await expect(page).toHaveURL(/\/about$/u);
  await expect(page).toHaveTitle(/About Gama3 Orderak/u);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://food-order-v1-peach.vercel.app/about',
  );
  await expect(page.locator('link[rel="alternate"]')).toHaveCount(13);
});

test('the mobile menu exposes the public navigation on narrow viewports', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.locator('.public-mobile-menu summary').click();
  await page
    .locator('.public-mobile-menu nav')
    .getByRole('link', { name: 'About' })
    .click();
  await expect(page).toHaveURL(/\/about$/u);
  await expect(page).toHaveTitle(/About Gama3 Orderak/u);
});

test('Arabic public content is RTL and remains usable at a mobile viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/ar/faq');

  await expect(page.locator('.public-site')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');
});

test('public policy, offline, and app documents deny advertising and indexing', async ({
  page,
}) => {
  await page.goto('/privacy');
  await expect(page.locator('.public-site')).toHaveAttribute(
    'data-ad-eligible',
    'false',
  );
  await expect(page.locator('script[src*="googlesyndication"]')).toHaveCount(0);

  await page.goto('/offline');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/u,
  );

  await page.goto('/app');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/u,
  );
});
