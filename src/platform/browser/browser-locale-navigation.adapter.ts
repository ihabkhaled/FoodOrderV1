import type { Locale } from '@/shared/types';

import { buildBrowserLocalePath } from './browser-locale-path.helper';

export const navigateToBrowserLocale = (locale: Locale): void => {
  const pathname = buildBrowserLocalePath(location.pathname, locale);
  location.assign(`${pathname}${location.search}${location.hash}`);
};
