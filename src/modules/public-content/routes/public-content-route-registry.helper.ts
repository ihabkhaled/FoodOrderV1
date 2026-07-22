import type {
  PublicContentMatch,
  PublicLocale,
  PublicLocaleDefinition,
  PublicRouteDefinition,
  PublicRouteId,
  PublicSystemRouteId,
} from '../types/public-content.types';

export const PUBLIC_LOCALES = [
  { code: 'en', segment: '', htmlLang: 'en', openGraphLocale: 'en_US', direction: 'ltr', label: 'English', contentSource: 'en' },
  { code: 'ar', segment: 'ar', htmlLang: 'ar', openGraphLocale: 'ar_AR', direction: 'rtl', label: 'العربية', contentSource: 'ar' },
  { code: 'it', segment: 'it', htmlLang: 'it', openGraphLocale: 'it_IT', direction: 'ltr', label: 'Italiano', contentSource: 'it' },
  { code: 'fa', segment: 'fa', htmlLang: 'fa', openGraphLocale: 'fa_IR', direction: 'rtl', label: 'فارسی', contentSource: 'fa' },
  { code: 'fr', segment: 'fr', htmlLang: 'fr', openGraphLocale: 'fr_FR', direction: 'ltr', label: 'Français', contentSource: 'fr' },
  { code: 'de', segment: 'de', htmlLang: 'de', openGraphLocale: 'de_DE', direction: 'ltr', label: 'Deutsch', contentSource: 'de' },
  { code: 'es', segment: 'es', htmlLang: 'es', openGraphLocale: 'es_ES', direction: 'ltr', label: 'Español', contentSource: 'es' },
  { code: 'pt-BR', segment: 'pt-br', htmlLang: 'pt-BR', openGraphLocale: 'pt_BR', direction: 'ltr', label: 'Português (Brasil)', contentSource: 'pt-BR' },
  { code: 'hi', segment: 'hi', htmlLang: 'hi', openGraphLocale: 'hi_IN', direction: 'ltr', label: 'हिन्दी', contentSource: 'hi' },
  { code: 'th', segment: 'th', htmlLang: 'th', openGraphLocale: 'th_TH', direction: 'ltr', label: 'ไทย', contentSource: 'th' },
  { code: 'zh-CN', segment: 'zh-cn', htmlLang: 'zh-CN', openGraphLocale: 'zh_CN', direction: 'ltr', label: '简体中文', contentSource: 'zh-CN' },
  { code: 'ja', segment: 'ja', htmlLang: 'ja', openGraphLocale: 'ja_JP', direction: 'ltr', label: '日本語', contentSource: 'ja' },
] as const satisfies readonly PublicLocaleDefinition[];

export const PUBLIC_ROUTE_DEFINITIONS = [
  { id: 'home', slug: '', navigation: true, adEligible: true },
  { id: 'about', slug: 'about', navigation: true, adEligible: true },
  { id: 'how-it-works', slug: 'how-it-works', navigation: true, adEligible: true },
  { id: 'features', slug: 'features', navigation: true, adEligible: true },
  { id: 'group-ordering', slug: 'group-ordering', navigation: true, adEligible: true },
  { id: 'split-bill-and-receipts', slug: 'split-bill-and-receipts', navigation: true, adEligible: true },
  { id: 'faq', slug: 'faq', navigation: true, adEligible: true },
  { id: 'contact', slug: 'contact', navigation: false, adEligible: false },
  { id: 'privacy', slug: 'privacy', navigation: false, adEligible: false },
  { id: 'terms', slug: 'terms', navigation: false, adEligible: false },
] as const satisfies readonly PublicRouteDefinition[];

const PUBLIC_SYSTEM_SLUGS: Record<PublicSystemRouteId, string> = {
  'not-found': '404.html',
  error: 'error',
  offline: 'offline',
};

export const PUBLIC_HOME_PATH = '/';

const normalizePathname = (pathname: string): string => {
  const pathOnly = pathname.split(/[?#]/u, 1)[0]?.trim() || PUBLIC_HOME_PATH;
  const withLeadingSlash = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  let normalized = withLeadingSlash;
  while (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
};

export const findPublicLocale = (
  locale: PublicLocale,
): PublicLocaleDefinition => {
  const definition = PUBLIC_LOCALES.find((candidate) => candidate.code === locale);
  if (!definition) throw new Error(`Unsupported public locale: ${locale}`);
  return definition;
};

export const findPublicRoute = (
  routeId: PublicRouteId,
): PublicRouteDefinition => {
  const definition = PUBLIC_ROUTE_DEFINITIONS.find(
    (candidate) => candidate.id === routeId,
  );
  if (!definition) throw new Error(`Unsupported public route: ${routeId}`);
  return definition;
};

export const buildPublicContentPath = (
  routeId: PublicRouteId,
  locale: PublicLocale,
): string => {
  const localeDefinition = findPublicLocale(locale);
  const route = findPublicRoute(routeId);
  const segments = [localeDefinition.segment, route.slug].filter(Boolean);
  return segments.length === 0 ? PUBLIC_HOME_PATH : `/${segments.join('/')}`;
};

export const buildPublicSystemPath = (
  routeId: PublicSystemRouteId,
  locale: PublicLocale,
): string => {
  const localeDefinition = findPublicLocale(locale);
  const segments = [localeDefinition.segment, PUBLIC_SYSTEM_SLUGS[routeId]].filter(Boolean);
  return `/${segments.join('/')}`;
};

const splitLocalizedPath = (
  pathname: string,
): { locale: PublicLocale; slug: string } => {
  const segments = normalizePathname(pathname).split('/').filter(Boolean);
  const localized = PUBLIC_LOCALES.find(
    (candidate) => candidate.segment && candidate.segment === segments[0],
  );
  if (!localized) return { locale: 'en', slug: segments.join('/') };
  return { locale: localized.code, slug: segments.slice(1).join('/') };
};

export const inferPublicLocale = (pathname: string): PublicLocale =>
  splitLocalizedPath(pathname).locale;

export const matchPublicContentPath = (
  pathname: string,
): PublicContentMatch | null => {
  const { locale, slug } = splitLocalizedPath(pathname);
  const page = PUBLIC_ROUTE_DEFINITIONS.find(
    (candidate) => candidate.slug === slug,
  );
  if (page) return { kind: 'page', locale, routeId: page.id };

  const systemEntry = Object.entries(PUBLIC_SYSTEM_SLUGS).find(
    ([, systemSlug]) => systemSlug === slug,
  );
  if (!systemEntry) return null;
  return {
    kind: 'system',
    locale,
    routeId: systemEntry[0] as PublicSystemRouteId,
  };
};

export const isPublicContentPath = (pathname: string): boolean =>
  matchPublicContentPath(pathname) !== null;
