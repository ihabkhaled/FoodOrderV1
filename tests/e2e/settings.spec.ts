import { expect, type Page, test } from '@playwright/test';

const register = async (page: Page, suffix: string): Promise<void> => {
  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('Settings Tester');
  await page
    .getByLabel('Email')
    .fill(`settings-${suffix}-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/app$/u);
};

test.describe('settings hub and subpages', () => {
  test('navigates from the hub to every subpage and back', async ({
    page,
  }) => {
    await register(page, 'hub');
    await page.goto('/settings');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeVisible();
    await expect(
      page.getByRole('main').getByText('Settings Tester'),
    ).toBeVisible();

    const sections = [
      { link: 'Preferences', heading: 'Preferences' },
      { link: 'Analytics and privacy', heading: 'Analytics and privacy' },
      { link: 'Password and security', heading: 'Change password' },
      { link: 'Data and account', heading: 'Data and account' },
    ];

    for (const section of sections) {
      await page.getByRole('link', { name: section.link }).click();
      await expect(
        page.getByRole('heading', { level: 1, name: section.heading }),
      ).toBeVisible();
      await page.getByRole('link', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', { level: 1, name: 'Settings' }),
      ).toBeVisible();
    }
  });

  test('saves preference changes from the preferences subpage', async ({
    page,
  }) => {
    await register(page, 'prefs');
    await page.goto('/settings/preferences');

    await page.getByLabel('Full name').fill('Renamed Tester');
    await page.getByRole('main').getByLabel('Theme').selectOption('dark');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.goto('/settings');
    await expect(
      page.getByRole('main').getByText('Renamed Tester'),
    ).toBeVisible();
  });

  test('saves the analytics consent from the privacy subpage', async ({
    page,
  }) => {
    await register(page, 'privacy');
    await page.goto('/settings/privacy');

    await page.getByRole('radio', { name: /Do not record analytics/u }).check();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Analytics preference saved.')).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole('radio', { name: /Do not record analytics/u }),
    ).toBeChecked();
  });
});
