export type PublicLocale =
  | 'en'
  | 'ar'
  | 'it'
  | 'fa'
  | 'fr'
  | 'de'
  | 'es'
  | 'pt-BR'
  | 'hi'
  | 'th'
  | 'zh-CN'
  | 'ja';

export type PublicDirection = 'ltr' | 'rtl';

export type PublicRouteId =
  | 'home'
  | 'about'
  | 'how-it-works'
  | 'features'
  | 'group-ordering'
  | 'split-bill-and-receipts'
  | 'faq'
  | 'contact'
  | 'privacy'
  | 'terms';

export type PublicSystemRouteId = 'not-found' | 'error' | 'offline';

export interface PublicLocaleDefinition {
  code: PublicLocale;
  segment: string;
  htmlLang: string;
  openGraphLocale: string;
  direction: PublicDirection;
  label: string;
  contentSource: PublicLocale;
}

export interface PublicRouteDefinition {
  id: PublicRouteId;
  slug: string;
  navigation: boolean;
  adEligible: boolean;
}

export interface PublicContentSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface PublicFaqItem {
  question: string;
  answer: string;
}

export interface PublicPageCopy {
  navigationLabel: string;
  seoTitle: string;
  description: string;
  eyebrow: string;
  heading: string;
  introduction: string;
  sections: PublicContentSection[];
  faq?: PublicFaqItem[];
}

export interface PublicSystemPageCopy {
  seoTitle: string;
  description: string;
  heading: string;
  body: string;
}

export interface PublicUiCopy {
  primaryNavigationLabel: string;
  mobileNavigationLabel: string;
  languageLabel: string;
  openApplicationLabel: string;
  skipToContentLabel: string;
  footerNavigationLabel: string;
  footerTagline: string;
  allRightsReservedLabel: string;
  backHomeLabel: string;
  tryAgainLabel: string;
  learnMoreLabel: string;
}

export interface PublicSiteDefinition {
  brandName: string;
  canonicalOrigin: string;
  socialImagePath: string;
  applicationPath: string;
  repositoryUrl: string;
}

export interface PublicCatalogPage extends PublicRouteDefinition {
  copy: Partial<Record<PublicLocale, PublicPageCopy>>;
}

export interface PublicContentCatalog {
  site: PublicSiteDefinition;
  locales: PublicLocaleDefinition[];
  ui: Partial<Record<PublicLocale, PublicUiCopy>>;
  pages: PublicCatalogPage[];
  systemPages: Record<
    PublicSystemRouteId,
    Partial<Record<PublicLocale, PublicSystemPageCopy>>
  >;
}

export interface PublicLocalizedContentCatalog {
  locale: PublicLocale;
  ui: PublicUiCopy;
  pages: Record<PublicRouteId, PublicPageCopy>;
  systemPages: Record<PublicSystemRouteId, PublicSystemPageCopy>;
}

export interface PublicRouteMatch {
  kind: 'page';
  locale: PublicLocale;
  routeId: PublicRouteId;
}

export interface PublicSystemRouteMatch {
  kind: 'system';
  locale: PublicLocale;
  routeId: PublicSystemRouteId;
}

export type PublicContentMatch = PublicRouteMatch | PublicSystemRouteMatch;

export interface PublicNavigationItem {
  href: string;
  label: string;
  current: boolean;
}

export interface PublicLocaleLink {
  code: PublicLocale;
  href: string;
  label: string;
  current: boolean;
}

export interface PublicMetadataAlternate {
  hrefLang: string;
  href: string;
}

export interface PublicPageMetadata {
  title: string;
  description: string;
  canonical: string;
  htmlLang: string;
  direction: PublicDirection;
  openGraphLocale: string;
  socialImage: string;
  alternates: PublicMetadataAlternate[];
  structuredData: Record<string, unknown>[];
}

export interface PublicContentViewModel {
  locale: PublicLocaleDefinition;
  site: PublicSiteDefinition;
  ui: PublicUiCopy;
  navigationItems: PublicNavigationItem[];
  footerItems: PublicNavigationItem[];
  localeLinks: PublicLocaleLink[];
  homePath: string;
  learnMorePath: string;
  page: null | {
    definition: PublicRouteDefinition;
    copy: PublicPageCopy;
    metadata: PublicPageMetadata;
  };
  systemPage: null | {
    id: PublicSystemRouteId;
    copy: PublicSystemPageCopy;
  };
}

export interface PublicHeaderProps {
  brandName: string;
  homePath: string;
  applicationPath: string;
  currentLocaleLabel: string;
  navigationItems: PublicNavigationItem[];
  localeLinks: PublicLocaleLink[];
  ui: PublicUiCopy;
}

export interface PublicFooterProps {
  brandName: string;
  homePath: string;
  items: PublicNavigationItem[];
  ui: PublicUiCopy;
}

export interface PublicPageProps {
  definition: PublicRouteDefinition;
  copy: PublicPageCopy;
  applicationPath: string;
  learnMorePath: string;
  ui: PublicUiCopy;
}

export interface PublicSystemPageProps {
  copy: PublicSystemPageCopy;
  homePath: string;
  ui: PublicUiCopy;
}

export interface PublicContentContainerProps {
  applicationPath: string;
}

export type PublicContentRoutesProps = PublicContentContainerProps;
