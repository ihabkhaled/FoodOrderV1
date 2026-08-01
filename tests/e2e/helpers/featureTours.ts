import type { Page } from '@playwright/test';

// Imported from the application, never copied. A hand-kept list silently
// stopped covering new pages and let their tours cover the interface.
import { TOUR_PAGES } from '../../../src/platform/device/tour-pages.constants';


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
  }, [...TOUR_PAGES]);
};
