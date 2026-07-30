import { expect, test } from '@playwright/test';

test('public navigation serves unique crawler metadata through real links', async ({
  page,
}) => {
  // The primary links live in the header's collapsible menu at every width a
  // real reader is likely to use, so open it before following one.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/en');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Collect group food orders without chasing messages',
    }),
  ).toBeVisible();

  await page.locator('.public-mobile-menu > summary').click();
  await page
    .locator('.public-mobile-menu')
    .getByRole('link', { name: 'About' })
    .click();
  await expect(page).toHaveURL(/\/en\/about$/u);
  await expect(page).toHaveTitle(/About Gama3 Orderak/u);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://food-order-v1-peach.vercel.app/en/about',
  );
  // Thirteen published locales plus x-default.
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(14);
  await expect(
    page.locator('link[rel="alternate"][hreflang="ar-Latn"]'),
  ).toHaveAttribute(
    'href',
    'https://food-order-v1-peach.vercel.app/ar-latn/about',
  );
});

test('the mobile menu exposes the public navigation on narrow viewports', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en');

  await page.locator('.public-mobile-menu summary').click();
  await page
    .locator('.public-mobile-menu nav')
    .getByRole('link', { name: 'About' })
    .click();
  await expect(page).toHaveURL(/\/en\/about$/u);
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
  await page.goto('/en/privacy');
  await expect(page.locator('.public-site')).toHaveAttribute(
    'data-ad-eligible',
    'false',
  );
  await expect(page.locator('script[src*="googlesyndication"]')).toHaveCount(0);

  await page.goto('/en/offline');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/u,
  );

  await page.goto('/en/app');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/u,
  );
});

test('contact page exposes an accessible localized form without private-data prompts', async ({
  page,
}) => {
  await page.route('**/api/contact', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });
  await page.goto('/ja/contact');

  await expect(page.getByRole('heading', { name: 'メッセージを送る' })).toBeVisible();
  await expect(page.getByLabel('お名前')).toBeEditable();
  await expect(page.getByLabel('メールアドレス')).toHaveAttribute('type', 'email');
  await expect(page.locator('input[name="subject"]')).toBeEditable();
  await expect(
    page.getByRole('textbox', { name: 'メッセージ', exact: true }),
  ).toHaveAttribute('maxlength', '5000');
  await expect(page.getByRole('button', { name: 'メッセージを送信' })).toBeVisible();

  await page.getByLabel('お名前').fill('テスト利用者');
  await page.getByLabel('メールアドレス').fill('test@example.com');
  await page.locator('input[name="subject"]').fill('送信テスト');
  await page
    .getByRole('textbox', { name: 'メッセージ', exact: true })
    .fill('フォーム送信の確認です。');
  await page.getByRole('button', { name: 'メッセージを送信' }).click();
  await expect(page).toHaveURL(/\/ja\/contact$/u);
  await expect(page.getByRole('status')).toHaveText('メッセージを送信しました。');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('changing the app language updates the URL and reloads the active screen', async ({
  page,
}) => {
  await page.goto('/en/auth/forgot');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await page.locator('.auth-language-select').selectOption('ar');

  await expect(page).toHaveURL(/\/ar\/auth\/forgot$/u);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.auth-language-select')).toHaveValue('ar');
});

test('public discovery exposes a locale sitemap index and bounded RSS', async ({
  request,
}) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const sitemapXml = await sitemap.text();
  expect((sitemapXml.match(/<sitemap>/gu) ?? [])).toHaveLength(13);
  expect(sitemapXml).toContain('/sitemaps/ja.xml');
  expect(sitemapXml).toContain('/sitemaps/ar-latn.xml');

  const feed = await request.get('/ja/feed.xml');
  expect(feed.ok()).toBe(true);
  const feedXml = await feed.text();
  expect(feedXml).toContain('<rss version="2.0"');
  expect(feedXml).toContain('<language>ja</language>');
  expect((feedXml.match(/<item>/gu) ?? []).length).toBeLessThanOrEqual(50);
});
