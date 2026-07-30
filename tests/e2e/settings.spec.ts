import { expect, type Page, test } from '@playwright/test';

import { suppressFeatureTours } from './helpers/featureTours';

test.beforeEach(async ({ page }) => {
  await suppressFeatureTours(page);
});

const register = async (page: Page, suffix: string): Promise<string> => {
  const email = `settings-${suffix}-${Date.now()}@example.com`;
  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('Settings Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/app$/u);
  return email;
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
      {
        link: 'Preferences',
        heading: 'Preferences',
        url: /\/settings\/preferences$/u,
      },
      {
        link: 'Analytics and privacy',
        heading: 'Analytics and privacy',
        url: /\/settings\/privacy$/u,
      },
      {
        link: 'Password and security',
        heading: 'Change password',
        url: /\/settings\/security$/u,
      },
      {
        link: 'Data and account',
        heading: 'Data and account',
        url: /\/settings\/account$/u,
      },
    ];

    for (const section of sections) {
      await page.getByRole('link', { name: section.link }).click();
      await page.waitForURL(section.url);
      await expect(
        page.getByRole('heading', { level: 1, name: section.heading }),
      ).toBeVisible();

      await page.getByRole('link', { name: 'Back' }).click();
      await page.waitForURL(/\/settings$/u);
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

const diagnosticsCount = async (page: Page): Promise<number> =>
  page.evaluate(() => {
    const raw = localStorage.getItem('foodorder:v1:diagnostics');
    if (!raw) return 0;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  });

const createBucket = async (page: Page, title: string): Promise<void> => {
  await page.goto('/buckets/new');
  await page.getByLabel('Bucket title').fill(title);
  await page.getByLabel('Item name').fill('Meal');
  await page.getByLabel('Unit price').fill('100');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/buckets$/u);
};

const setConsent = async (page: Page, option: RegExp): Promise<void> => {
  await page.goto('/settings/privacy');
  await page.getByRole('radio', { name: option }).check();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Analytics preference saved.')).toBeVisible();
};

test.describe('analytics consent has real effect', () => {
  test('denied consent records nothing while product consent records events', async ({
    page,
  }) => {
    await register(page, 'consent-effect');
    await createBucket(page, 'Consent menu');

    await setConsent(page, /Do not record analytics/u);
    await page.evaluate(() => {
      localStorage.removeItem('foodorder:v1:diagnostics');
    });

    await page.goto('/buckets');
    await page
      .getByRole('button', { name: 'Duplicate — Consent menu', exact: true })
      .first()
      .click();
    await expect(page.getByText('Bucket saved.')).toBeVisible();
    expect(await diagnosticsCount(page)).toBe(0);

    await setConsent(page, /Operational and product analytics/u);
    await page.goto('/buckets');
    await page
      .getByRole('button', { name: 'Duplicate — Consent menu', exact: true })
      .first()
      .click();
    await expect(page.getByText('Bucket saved.')).toBeVisible();

    await expect.poll(async () => diagnosticsCount(page)).toBeGreaterThan(0);
  });
});

test.describe('account deletion requires credentials', () => {
  test('wrong credentials keep the account alive', async ({ page }) => {
    await register(page, 'delete-wrong');
    await page.goto('/settings/account');

    await page.getByRole('button', { name: 'Delete account' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Confirm it is you' }),
    ).toBeVisible();

    await dialog.getByLabel('Email').fill('someone-else@example.com');
    await dialog.getByLabel('Password').fill('Password1');
    await dialog
      .getByRole('button', { name: 'Delete account permanently' })
      .click();

    await expect(dialog.getByText('Invalid email or password.')).toBeVisible();
    await expect(page).toHaveURL(/\/settings\/account$/u);
  });

  test('matching credentials delete the account and end the session', async ({
    page,
  }) => {
    const email = await register(page, 'delete-ok');
    await page.goto('/settings/account');

    await page.getByRole('button', { name: 'Delete account' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Email').fill(email);
    await dialog.getByLabel('Password').fill('Password1');
    await dialog
      .getByRole('button', { name: 'Delete account permanently' })
      .click();

    await page.waitForURL(/\/auth\/login/u);

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('Password1');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  });
});
