import { describe, expect, it } from 'vitest';

import {
  buildBrowserLocalePath,
  hasBrowserLocalePrefix,
  replaceBrowserPath,
} from '@/platform/browser';

describe('browser locale paths', () => {
  it.each([
    ['/auth/forgot', 'ar', '/ar/auth/forgot'],
    ['/en/app', 'ar', '/ar/app'],
    ['/pt-br/settings', 'zh-CN', '/zh-cn/settings'],
    ['/', 'en', '/en'],
  ] as const)('maps %s to the %s route', (pathname, locale, expected) => {
    expect(buildBrowserLocalePath(pathname, locale)).toBe(expected);
  });

  it('detects canonical locale prefixes without matching longer segments', () => {
    expect(hasBrowserLocalePrefix('/ar/auth/forgot')).toBe(true);
    expect(hasBrowserLocalePrefix('/pt-br/settings')).toBe(true);
    expect(hasBrowserLocalePrefix('/english/app')).toBe(false);
  });

  it('preserves reset query parameters and fragments during canonicalization', () => {
    history.replaceState(
      {},
      '',
      '/auth/action?mode=resetPassword&oobCode=secret#reset',
    );

    replaceBrowserPath('/ar/auth/action');

    expect(location.pathname).toBe('/ar/auth/action');
    expect(location.search).toBe('?mode=resetPassword&oobCode=secret');
    expect(location.hash).toBe('#reset');
  });
});
