import { expect, type Page, test } from '@playwright/test';

const tourKey = (page: string): string => `CapacitorStorage.ui:tour:${page}`;

const register = async (page: Page, suffix: string): Promise<void> => {
  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('Tour Tester');
  await page
    .getByLabel('Email')
    .fill(`tour-${suffix}-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/app$/u);
};

const dashboardTour = (page: Page) =>
  page.getByRole('dialog', { name: 'Your food at a glance' });

const storedFlag = async (page: Page, name: string): Promise<string | null> =>
  page.evaluate((key) => localStorage.getItem(key), tourKey(name));

test.describe('guided page tours', () => {
  test('introduces itself on a first visit and walks through both steps', async ({
    page,
  }) => {
    await register(page, 'first-visit');

    await expect(dashboardTour(page)).toBeVisible();
    await expect(page.getByText('1 / 2')).toBeVisible();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('2 / 2')).toBeVisible();
    await expect(page.getByText('Start here')).toBeVisible();
  });

  test('"Got it" retires only the tour that was finished', async ({ page }) => {
    await register(page, 'got-it');

    await expect(dashboardTour(page)).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(dashboardTour(page)).toBeHidden();

    await expect.poll(async () => storedFlag(page, 'dashboard')).toBe('true');
    // Other screens are untouched.
    expect(await storedFlag(page, 'buckets')).toBeNull();

    await page.reload();
    await page.waitForURL(/\/app$/u);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(dashboardTour(page)).toBeHidden();
  });

  test('"Skip" closes this visit only and leaves the tour for next time', async ({
    page,
  }) => {
    await register(page, 'skip-only');

    await expect(dashboardTour(page)).toBeVisible();
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
    await expect(dashboardTour(page)).toBeHidden();

    expect(await storedFlag(page, 'dashboard')).toBeNull();

    await page.reload();
    await page.waitForURL(/\/app$/u);
    await expect(dashboardTour(page)).toBeVisible();
  });

  test('"Skip all" silences every screen at once', async ({ page }) => {
    await register(page, 'skip-all');

    await expect(dashboardTour(page)).toBeVisible();
    await page.getByRole('button', { name: 'Skip all' }).click();
    await expect(dashboardTour(page)).toBeHidden();

    await expect.poll(async () => storedFlag(page, 'dashboard')).toBe('true');
    await expect.poll(async () => storedFlag(page, 'buckets')).toBe('true');
    await expect.poll(async () => storedFlag(page, 'settings')).toBe('true');

    // No tour greets the next screen either.
    await page.goto('/buckets');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('replaying tutorials from settings brings the tours back', async ({
    page,
  }) => {
    await register(page, 'replay');

    await expect(dashboardTour(page)).toBeVisible();
    await page.getByRole('button', { name: 'Skip all' }).click();

    await page.goto('/settings/preferences');
    await page.getByRole('button', { name: 'Replay tutorials' }).click();
    await expect(
      page.getByText('Tutorials will show again on each page.'),
    ).toBeVisible();

    await page.goto('/app');
    await expect(dashboardTour(page)).toBeVisible();
  });
});
