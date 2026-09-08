import { expect, type Page, test } from '@playwright/test';

import { suppressFeatureTours } from './helpers/featureTours';

const register = async (page: Page): Promise<void> => {
  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('Demo User');
  await page.getByLabel('Email').fill(`legibility-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Create account' }).click();
};

/**
 * The interface has to be usable by someone reading a phone at arm's length
 * without glasses. These are the measurable parts of that promise, so they are
 * asserted rather than reviewed: text that is too small and targets that are
 * too tight come back silently, one component at a time.
 */
test.describe('legibility floor', () => {
  test.beforeEach(async ({ page }) => {
    await suppressFeatureTours(page);
  });

  test('every destination is visible without scrolling the navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await register(page);
    // Wait for the shell itself rather than a timeout: the bar renders once
    // the authenticated layout mounts.
    await expect(page.locator('.bottom-nav')).toBeVisible();

    const measurements = await page.evaluate(() => {
      const nav = document.querySelector('.bottom-nav');
      if (!nav) return null;
      const links = [...nav.querySelectorAll('.bottom-nav-link')];
      return {
        count: links.length,
        overflows: nav.scrollWidth > nav.clientWidth + 1,
        smallestTarget: Math.min(
          ...links.map((link) => {
            const element = link as HTMLElement;
            return Math.min(element.offsetWidth, element.offsetHeight);
          }),
        ),
      };
    });

    expect(measurements).not.toBeNull();
    // A navigation bar that scrolls hides options from the person least
    // likely to discover them by swiping.
    expect(measurements!.overflows).toBe(false);
    expect(measurements!.count).toBeLessThanOrEqual(5);
    expect(measurements!.smallestTarget).toBeGreaterThanOrEqual(48);
  });

  test('no visible text falls below the readable floor', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await register(page);
    await expect(page.locator('.bottom-nav')).toBeVisible();

    const tooSmall = await page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .filter((element) => {
          const node = element as HTMLElement;
          if (node.offsetParent === null) return false;
          if (node.textContent.trim() === '') return false;
          return Number.parseFloat(getComputedStyle(node).fontSize) < 13;
        })
        .slice(0, 10)
        .map((element) => `${element.tagName}.${element.className}`),
    );

    expect(tooSmall).toEqual([]);
  });
});
