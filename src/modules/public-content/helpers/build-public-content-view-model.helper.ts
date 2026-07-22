import {
  buildPublicContentPath,
  buildPublicSystemPath,
  findPublicRoute,
  inferPublicLocale,
  matchPublicContentPath,
  PUBLIC_LOCALES,
  PUBLIC_ROUTE_DEFINITIONS,
} from '../routes/public-content-route-registry.helper';
import type {
  PublicContentViewModel,
  PublicLocale,
  PublicRouteId,
  PublicSystemRouteId,
} from '../types/public-content.types';
import { buildPublicPageMetadata } from './build-public-metadata.helper';
import {
  getPublicContentCatalog,
  getPublicLocaleDefinition,
  getPublicPageCopy,
  getPublicSystemPageCopy,
  getPublicUiCopy,
} from './public-content-catalog.helper';

const FOOTER_ROUTE_IDS: readonly PublicRouteId[] = [
  'about',
  'how-it-works',
  'features',
  'faq',
  'contact',
  'privacy',
  'terms',
];

const buildLocaleHref = (
  locale: PublicLocale,
  routeId: PublicRouteId | PublicSystemRouteId,
  kind: 'page' | 'system',
): string =>
  kind === 'page'
    ? buildPublicContentPath(routeId as PublicRouteId, locale)
    : buildPublicSystemPath(routeId as PublicSystemRouteId, locale);

export const buildPublicContentViewModel = (
  pathname: string,
): PublicContentViewModel => {
  const match = matchPublicContentPath(pathname);
  const localeCode = match?.locale ?? inferPublicLocale(pathname);
  const locale = getPublicLocaleDefinition(localeCode);
  const currentRouteId = match?.kind === 'page' ? match.routeId : null;
  const navigationItems = PUBLIC_ROUTE_DEFINITIONS.filter(
    (route) => route.navigation,
  ).map((route) => ({
    href: buildPublicContentPath(route.id, localeCode),
    label: getPublicPageCopy(route.id, localeCode).navigationLabel,
    current: route.id === currentRouteId,
  }));
  const footerItems = FOOTER_ROUTE_IDS.map((routeId) => ({
    href: buildPublicContentPath(routeId, localeCode),
    label: getPublicPageCopy(routeId, localeCode).navigationLabel,
    current: routeId === currentRouteId,
  }));
  const localeRoute = match ?? {
    kind: 'system' as const,
    locale: localeCode,
    routeId: 'not-found' as const,
  };
  const localeLinks = PUBLIC_LOCALES.map((candidate) => ({
    code: candidate.code,
    href: buildLocaleHref(candidate.code, localeRoute.routeId, localeRoute.kind),
    label: candidate.label,
    current: candidate.code === localeCode,
  }));
  const common = {
    locale,
    site: getPublicContentCatalog().site,
    ui: getPublicUiCopy(localeCode),
    navigationItems,
    footerItems,
    localeLinks,
    homePath: buildPublicContentPath('home', localeCode),
    learnMorePath: buildPublicContentPath('how-it-works', localeCode),
  };

  if (match?.kind === 'page') {
    return {
      ...common,
      page: {
        definition: findPublicRoute(match.routeId),
        copy: getPublicPageCopy(match.routeId, localeCode),
        metadata: buildPublicPageMetadata(match.routeId, localeCode),
      },
      systemPage: null,
    };
  }

  const systemRouteId = match?.kind === 'system' ? match.routeId : 'not-found';
  return {
    ...common,
    page: null,
    systemPage: {
      id: systemRouteId,
      copy: getPublicSystemPageCopy(systemRouteId, localeCode),
    },
  };
};
