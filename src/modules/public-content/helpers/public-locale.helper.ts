import type { Locale } from '@/shared/types';

import type { PublicLocale } from '../types/public-content.types';

const PUBLIC_LOCALE_FALLBACKS: Partial<Record<Locale, PublicLocale>> = {
  // Arabic Franco is an informal chat register with no standard orthography,
  // so the indexable marketing site keeps formal Arabic instead.
  'ar-Latn': 'ar',
};

const PUBLIC_LOCALES = new Set<string>([
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

/**
 * Narrows an application locale to one the public site actually publishes.
 * App-only locales fall back to their closest published language.
 */
export const toPublicLocale = (locale: Locale): PublicLocale =>
  PUBLIC_LOCALE_FALLBACKS[locale] ??
  (PUBLIC_LOCALES.has(locale) ? (locale as PublicLocale) : 'en');
