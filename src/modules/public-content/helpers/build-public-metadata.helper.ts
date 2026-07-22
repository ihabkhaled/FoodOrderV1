import {
  buildPublicContentPath,
  PUBLIC_LOCALES,
} from '../routes/public-content-route-registry.helper';
import type {
  PublicLocale,
  PublicPageMetadata,
  PublicRouteId,
} from '../types/public-content.types';
import {
  getPublicContentCatalog,
  getPublicLocaleDefinition,
  getPublicPageCopy,
} from './public-content-catalog.helper';

const absoluteUrl = (path: string): string =>
  new URL(path, getPublicContentCatalog().site.canonicalOrigin).toString();

const buildStructuredData = (
  routeId: PublicRouteId,
  locale: PublicLocale,
): Record<string, unknown>[] => {
  const { site } = getPublicContentCatalog();
  const copy = getPublicPageCopy(routeId, locale);
  const canonical = absoluteUrl(buildPublicContentPath(routeId, locale));
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.brandName,
    url: site.canonicalOrigin,
    logo: absoluteUrl('/icon.svg'),
    sameAs: [site.repositoryUrl],
  };
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.brandName,
    url: site.canonicalOrigin,
    inLanguage: getPublicLocaleDefinition(locale).htmlLang,
  };
  const application = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: site.brandName,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web, Android, iOS',
    description: copy.description,
    url: canonical,
  };
  const result: Record<string, unknown>[] = [organization];
  if (routeId === 'home') result.push(website, application);
  if (routeId !== 'home') {
    result.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: getPublicPageCopy('home', locale).navigationLabel,
          item: absoluteUrl(buildPublicContentPath('home', locale)),
        },
        { '@type': 'ListItem', position: 2, name: copy.heading, item: canonical },
      ],
    });
  }
  if (routeId === 'faq' && copy.faq) {
    result.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: copy.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    });
  }
  return result;
};

export const buildPublicPageMetadata = (
  routeId: PublicRouteId,
  locale: PublicLocale,
): PublicPageMetadata => {
  const { site } = getPublicContentCatalog();
  const copy = getPublicPageCopy(routeId, locale);
  const localeDefinition = getPublicLocaleDefinition(locale);
  return {
    title: copy.seoTitle,
    description: copy.description,
    canonical: absoluteUrl(buildPublicContentPath(routeId, locale)),
    htmlLang: localeDefinition.htmlLang,
    direction: localeDefinition.direction,
    openGraphLocale: localeDefinition.openGraphLocale,
    socialImage: absoluteUrl(site.socialImagePath),
    alternates: [
      ...PUBLIC_LOCALES.map((candidate) => ({
        hrefLang: candidate.htmlLang,
        href: absoluteUrl(buildPublicContentPath(routeId, candidate.code)),
      })),
      {
        hrefLang: 'x-default',
        href: absoluteUrl(buildPublicContentPath(routeId, 'en')),
      },
    ],
    structuredData: buildStructuredData(routeId, locale),
  };
};
