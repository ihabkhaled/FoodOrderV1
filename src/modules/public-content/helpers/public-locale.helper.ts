import type { Locale } from '@/shared/types';

import type { PublicLocale } from '../types/public-content.types';

const PUBLIC_LOCALES = new Set<string>([
  'en',
  'ar',
  'ar-Latn',
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
 *
 * Every app locale is published today, so this is currently a pass-through and
 * TypeScript accepts the return without a cast. Adding an app-only locale will
 * fail compilation here on purpose: the choice between publishing it and giving
 * it a fallback belongs in this file, not silently at every call site.
 */
export const toPublicLocale = (locale: Locale): PublicLocale =>
  PUBLIC_LOCALES.has(locale) ? locale : 'en';
