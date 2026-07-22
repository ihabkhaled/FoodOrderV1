import { afterEach, describe, expect, it, vi } from 'vitest';

import { getBrowserLanguages } from '@/platform/browser/browser-language.adapter';
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  LOCALE_DEFINITIONS,
  localeDirection,
  matchSupportedLocale,
  resolvePreferredLocale,
  RTL_LOCALES,
  SUPPORTED_LOCALES,
} from '@/shared/i18n';

describe('locale runtime definitions', () => {
  it('defines all supported locales with native names and correct direction', () => {
    expect(SUPPORTED_LOCALES).toEqual([
      'en',
      'ar',
      'it',
      'fa',
      'fr',
      'de',
      'es',
      'pt-BR',
      'hi',
      'th',
      'zh-CN',
      'ja',
    ]);
    expect(Object.keys(LOCALE_DEFINITIONS)).toEqual(SUPPORTED_LOCALES);
    expect(
      SUPPORTED_LOCALES.every(
        (locale) => LOCALE_DEFINITIONS[locale].nativeName.trim().length > 0,
      ),
    ).toBe(true);
    expect(RTL_LOCALES).toEqual(new Set(['ar', 'fa']));
    expect(localeDirection('fa')).toBe('rtl');
    expect(localeDirection('de')).toBe('ltr');
  });

  it('recognizes only exact application locale codes', () => {
    expect(isSupportedLocale('pt-BR')).toBe(true);
    expect(isSupportedLocale('pt-br')).toBe(false);
    expect(isSupportedLocale('nl')).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
  });

  it('matches exact, regional, underscored, and Simplified Chinese tags', () => {
    expect(matchSupportedLocale(['pt_BR'])).toBe('pt-BR');
    expect(matchSupportedLocale(['fr-CA'])).toBe('fr');
    expect(matchSupportedLocale(['zh-Hans-SG'])).toBe('zh-CN');
    expect(matchSupportedLocale(['zh-TW', 'ja-JP'])).toBe('ja');
    expect(matchSupportedLocale(['nl-NL'])).toBeNull();
    expect(matchSupportedLocale(['', 'de-DE'])).toBe('de');
  });

  it('gives an explicit stored preference priority over browser detection', () => {
    expect(resolvePreferredLocale('it', ['ar-EG'])).toBe('it');
    expect(resolvePreferredLocale('unsupported', ['fa-IR'])).toBe('fa');
    expect(resolvePreferredLocale(null, ['nl-NL'], 'th')).toBe('th');
    expect(resolvePreferredLocale(null, [])).toBe(DEFAULT_LOCALE);
  });
});

describe('browser language adapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the browser preference list in priority order', () => {
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue([
      'fr-CA',
      'en-US',
    ]);
    expect(getBrowserLanguages()).toEqual(['fr-CA', 'en-US']);
  });

  it('falls back to the single browser language when the list is empty', () => {
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue([]);
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('de-DE');
    expect(getBrowserLanguages()).toEqual(['de-DE']);
  });

  it('returns an empty list when the browser reports no language', () => {
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue([]);
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('');
    expect(getBrowserLanguages()).toEqual([]);
  });
});
