import type { Page } from '@playwright/test';

/** Mirrors the pages listed in `src/platform/device/tour-flags.adapter.ts`. */
const TOUR_PAGES = [
  'dashboard',
  'buckets',
  'bucket-editor',
  'bucket-share',
  'collaborate',
  'social-share',
  'join',
  'orders',
  'order-details',
  'create-order',
  'sessions',
  'session-details',
  'create-session',
  'social',
  'settings',
  'settings-preferences',
  'settings-privacy',
  'settings-security',
  'settings-account',
];

/**
 * Marks every guided tour as already dismissed.
 *
 * Tours introduce themselves on a page's first visit, which would otherwise
 * cover the interface in every end-to-end run. Suites that specifically test
 * the tours skip this helper.
 *
 * The key prefix matches the web implementation of Capacitor Preferences.
 */
export const suppressFeatureTours = async (page: Page): Promise<void> => {
  await page.addInitScript((pages: string[]) => {
    for (const name of pages) {
      localStorage.setItem(`CapacitorStorage.ui:tour:${name}`, 'true');
    }
  }, TOUR_PAGES);
};
