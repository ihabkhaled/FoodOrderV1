import type { Locale } from '@/shared/types';

export type LocaleDirection = 'ltr' | 'rtl';

export interface LocaleDefinition {
  readonly code: Locale;
  readonly nativeName: string;
  readonly compactName: string;
  readonly direction: LocaleDirection;
  readonly browserLanguagePrefixes: readonly string[];
}

export const DEFAULT_LOCALE: Locale = 'en';

export const SUPPORTED_LOCALES = [
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
] as const satisfies readonly Locale[];

export const LOCALE_DEFINITIONS = {
  en: {
    code: 'en',
    nativeName: 'English',
    compactName: 'E',
    direction: 'ltr',
    browserLanguagePrefixes: ['en'],
  },
  ar: {
    code: 'ar',
    nativeName: 'العربية',
    compactName: 'ع',
    direction: 'rtl',
    browserLanguagePrefixes: ['ar'],
  },
  it: {
    code: 'it',
    nativeName: 'Italiano',
    compactName: 'I',
    direction: 'ltr',
    browserLanguagePrefixes: ['it'],
  },
  fa: {
    code: 'fa',
    nativeName: 'فارسی',
    compactName: 'ف',
    direction: 'rtl',
    browserLanguagePrefixes: ['fa'],
  },
  fr: {
    code: 'fr',
    nativeName: 'Français',
    compactName: 'F',
    direction: 'ltr',
    browserLanguagePrefixes: ['fr'],
  },
  de: {
    code: 'de',
    nativeName: 'Deutsch',
    compactName: 'D',
    direction: 'ltr',
    browserLanguagePrefixes: ['de'],
  },
  es: {
    code: 'es',
    nativeName: 'Español',
    compactName: 'E',
    direction: 'ltr',
    browserLanguagePrefixes: ['es'],
  },
  'pt-BR': {
    code: 'pt-BR',
    nativeName: 'Português',
    compactName: 'P',
    direction: 'ltr',
    browserLanguagePrefixes: ['pt'],
  },
  hi: {
    code: 'hi',
    nativeName: 'हिन्दी',
    compactName: 'ह',
    direction: 'ltr',
    browserLanguagePrefixes: ['hi'],
  },
  th: {
    code: 'th',
    nativeName: 'ไทย',
    compactName: 'ไ',
    direction: 'ltr',
    browserLanguagePrefixes: ['th'],
  },
  'zh-CN': {
    code: 'zh-CN',
    nativeName: '简体中文',
    compactName: '简',
    direction: 'ltr',
    browserLanguagePrefixes: ['zh-cn', 'zh-hans', 'zh-sg', 'zh'],
  },
  ja: {
    code: 'ja',
    nativeName: '日本語',
    compactName: '日',
    direction: 'ltr',
    browserLanguagePrefixes: ['ja'],
  },
} as const satisfies Record<Locale, LocaleDefinition>;

export const RTL_LOCALES: ReadonlySet<Locale> = new Set<Locale>(['ar', 'fa']);

const SUPPORTED_LOCALE_SET: ReadonlySet<string> = new Set(SUPPORTED_LOCALES);

const normalizeLanguageTag = (value: string): string =>
  value.trim().replaceAll('_', '-').toLowerCase();

export const isSupportedLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && SUPPORTED_LOCALE_SET.has(value);

export const localeDirection = (locale: Locale): LocaleDirection =>
  RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';

export const matchSupportedLocale = (
  preferredLanguages: readonly string[],
): Locale | null => {
  for (const preferredLanguage of preferredLanguages) {
    const normalized = normalizeLanguageTag(preferredLanguage);
    if (!normalized) continue;

    const exact = SUPPORTED_LOCALES.find(
      (locale) => normalizeLanguageTag(locale) === normalized,
    );
    if (exact) return exact;

    if (/^zh-(?:hant|tw|hk|mo)(?:-|$)/u.test(normalized)) continue;

    const matched = SUPPORTED_LOCALES.find((locale) =>
      LOCALE_DEFINITIONS[locale].browserLanguagePrefixes.some(
        (prefix) =>
          normalized === prefix || normalized.startsWith(`${prefix}-`),
      ),
    );
    if (matched) return matched;
  }

  return null;
};

export const resolvePreferredLocale = (
  storedLocale: string | null,
  preferredLanguages: readonly string[],
  fallback: Locale = DEFAULT_LOCALE,
): Locale =>
  isSupportedLocale(storedLocale)
    ? storedLocale
    : (matchSupportedLocale(preferredLanguages) ?? fallback);
