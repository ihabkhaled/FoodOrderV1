import catalogData from '../content/public-content.catalog.json';
import {
  PUBLIC_LOCALES,
  PUBLIC_ROUTE_DEFINITIONS,
} from '../routes/public-content-route-registry.helper';
import type {
  PublicContentCatalog,
  PublicLocale,
  PublicLocaleDefinition,
  PublicLocalizedContentCatalog,
  PublicPageCopy,
  PublicRouteId,
  PublicSystemPageCopy,
  PublicSystemRouteId,
  PublicUiCopy,
} from '../types/public-content.types';

const localizedCatalogs = Object.values(
  import.meta.glob<PublicLocalizedContentCatalog>(
    '../content/locales/*.json',
    { eager: true, import: 'default' },
  ),
);
const baseCatalog = catalogData as unknown as PublicContentCatalog;
const catalog: PublicContentCatalog = {
  ...baseCatalog,
  ui: { ...baseCatalog.ui },
  pages: baseCatalog.pages.map((page) => ({ ...page, copy: { ...page.copy } })),
  systemPages: {
    'not-found': { ...baseCatalog.systemPages['not-found'] },
    error: { ...baseCatalog.systemPages.error },
    offline: { ...baseCatalog.systemPages.offline },
  },
};

for (const localized of localizedCatalogs) {
  catalog.ui[localized.locale] = localized.ui;
  for (const page of catalog.pages) {
    page.copy[localized.locale] = localized.pages[page.id];
  }
  for (const routeId of ['not-found', 'error', 'offline'] as const) {
    catalog.systemPages[routeId][localized.locale] =
      localized.systemPages[routeId];
  }
}

const assertCatalog = (): void => {
  if (!catalog.site.canonicalOrigin.startsWith('https://')) {
    throw new Error('Public content catalog requires an HTTPS canonical origin.');
  }
  if (catalog.locales.length !== PUBLIC_LOCALES.length) {
    throw new Error('Public content locale registry and catalog are out of sync.');
  }
  if (catalog.pages.length !== PUBLIC_ROUTE_DEFINITIONS.length) {
    throw new Error('Public content route registry and catalog are out of sync.');
  }
  for (const locale of PUBLIC_LOCALES) {
    if (!catalog.locales.some((candidate) => candidate.code === locale.code)) {
      throw new Error(`Missing public locale catalog entry: ${locale.code}`);
    }
  }
  for (const route of PUBLIC_ROUTE_DEFINITIONS) {
    const page = catalog.pages.find((candidate) => candidate.id === route.id);
    if (!page) throw new Error(`Missing public page: ${route.id}`);
    for (const locale of PUBLIC_LOCALES) {
      if (!page.copy[locale.contentSource]?.heading) {
        throw new Error(`Missing public copy: ${route.id}/${locale.code}`);
      }
    }
  }
};

assertCatalog();

export const getPublicContentCatalog = (): PublicContentCatalog => catalog;

export const getPublicLocaleDefinition = (
  locale: PublicLocale,
): PublicLocaleDefinition => {
  const definition = catalog.locales.find((candidate) => candidate.code === locale);
  if (!definition) throw new Error(`Missing public locale: ${locale}`);
  return definition;
};

export const getPublicPageCopy = (
  routeId: PublicRouteId,
  locale: PublicLocale,
): PublicPageCopy => {
  const page = catalog.pages.find((candidate) => candidate.id === routeId);
  if (!page) throw new Error(`Missing public page: ${routeId}`);
  const copy = page.copy[getPublicLocaleDefinition(locale).contentSource];
  if (!copy) throw new Error(`Missing public page copy: ${routeId}/${locale}`);
  return copy;
};

export const getPublicUiCopy = (locale: PublicLocale): PublicUiCopy => {
  const copy = catalog.ui[getPublicLocaleDefinition(locale).contentSource];
  if (!copy) throw new Error(`Missing public UI copy: ${locale}`);
  return copy;
};

export const getPublicSystemPageCopy = (
  routeId: PublicSystemRouteId,
  locale: PublicLocale,
): PublicSystemPageCopy => {
  const copy =
    catalog.systemPages[routeId][
      getPublicLocaleDefinition(locale).contentSource
    ];
  if (!copy) throw new Error(`Missing public system copy: ${routeId}/${locale}`);
  return copy;
};
