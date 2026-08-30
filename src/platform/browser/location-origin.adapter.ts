import { BROWSER_LOCALE_PREFIX_PATTERN } from './browser-locale-path.constants';

/**
 * Origin plus the locale segment the app is currently mounted under.
 *
 * The web build gives its router a `/{locale}` basename, so a shared link that
 * omits the segment lands outside the router and never reaches the route it
 * names. Reading it from the live URL keeps the shared link correct under
 * whichever locale the sharer is using, and yields a bare origin in the native
 * build, which has no basename.
 */
export const getApplicationBaseUrl = (): string => {
  const { origin, pathname } = globalThis.location;
  const localePrefix = BROWSER_LOCALE_PREFIX_PATTERN.exec(pathname)?.[0] ?? '';
  return `${origin}${localePrefix}`;
};
