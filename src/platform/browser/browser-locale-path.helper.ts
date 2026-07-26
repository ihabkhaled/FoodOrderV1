import type { Locale } from '@/shared/types';

import { BROWSER_LOCALE_PREFIX_PATTERN } from './browser-locale-path.constants';

export const hasBrowserLocalePrefix = (pathname: string): boolean =>
  BROWSER_LOCALE_PREFIX_PATTERN.test(pathname);

export const buildBrowserLocalePath = (
  pathname: string,
  locale: Locale,
): string => {
  const unprefixedPath = pathname.replace(BROWSER_LOCALE_PREFIX_PATTERN, '') || '/';
  const suffix = unprefixedPath === '/' ? '' : unprefixedPath;
  return `/${locale.toLowerCase()}${suffix}`;
};
