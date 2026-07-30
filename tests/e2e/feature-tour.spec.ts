import { expect, type Page, test } from '@playwright/test';

const TOUR_KEY = 'CapacitorStorage.ui:tour:dashboard';

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

    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(dashboardTour(page)).toBeHidden();
  });

  test('skipping without the checkbox leaves the tour for next time', async ({
    page,
  }) => {
    await register(page, 'skip-only');

    await expect(dashboardTour(page)).toBeVisible();
    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(dashboardTour(page)).toBeHidden();

    expect(await page.evaluate((key) => localStorage.getItem(key), TOUR_KEY)).toBeNull();
  });

  test('"do not show again" is remembered across a reload', async ({
    page,
  }) => {
    await register(page, 'dismiss');

    await expect(dashboardTour(page)).toBeVisible();
    await page.getByRole('checkbox', { name: "Don't show this again" }).check();
    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(dashboardTour(page)).toBeHidden();

    await expect
      .poll(async () => page.evaluate((key) => localStorage.getItem(key), TOUR_KEY))
      .toBe('true');

    await page.reload();
    await page.waitForURL(/\/app$/u);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(dashboardTour(page)).toBeHidden();
  });

  test('replaying tutorials from settings brings the tour back', async ({
    page,
  }) => {
    await register(page, 'replay');

    await expect(dashboardTour(page)).toBeVisible();
    await page.getByRole('checkbox', { name: "Don't show this again" }).check();
    await page.getByRole('button', { name: 'Skip' }).click();

    await page.goto('/settings/preferences');
    // This page runs its own tour, which must be closed before the control
    // underneath it can be used.
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.getByRole('button', { name: 'Replay tutorials' }).click();
    await expect(page.getByText('Tutorials will show again on each page.')).toBeVisible();

    await page.goto('/app');
    await expect(dashboardTour(page)).toBeVisible();
  });
});
