import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export const PUBLIC_CATALOG_PATH = path.join(
  'src',
  'modules',
  'public-content',
  'content',
  'public-content.catalog.json',
);

export const loadPublicCatalog = async (root = process.cwd()) => {
  const baseCatalog = JSON.parse(
    await readFile(path.join(root, PUBLIC_CATALOG_PATH), 'utf8'),
  );
  const localeDirectory = path.join(
    root,
    'src',
    'modules',
    'public-content',
    'content',
    'locales',
  );
  const localeFiles = await readdir(localeDirectory).catch((error) => {
    if (error?.code === 'ENOENT') return [];
    throw error;
  });
  const localizedCatalogs = await Promise.all(
    localeFiles
      .filter((fileName) => fileName.endsWith('.json'))
      .map(async (fileName) =>
        JSON.parse(await readFile(path.join(localeDirectory, fileName), 'utf8')),
      ),
  );
  const catalog = {
    ...baseCatalog,
    ui: { ...baseCatalog.ui },
    pages: baseCatalog.pages.map((page) => ({
      ...page,
      copy: { ...page.copy },
    })),
    systemPages: Object.fromEntries(
      Object.entries(baseCatalog.systemPages).map(([routeId, copy]) => [
        routeId,
        { ...copy },
      ]),
    ),
  };
  for (const localized of localizedCatalogs) {
    catalog.ui[localized.locale] = localized.ui;
    for (const page of catalog.pages) {
      page.copy[localized.locale] = localized.pages[page.id];
    }
    for (const [routeId, copy] of Object.entries(localized.systemPages)) {
      catalog.systemPages[routeId][localized.locale] = copy;
    }
  }
  return catalog;
};

export const isProductionIndexingEnabled = (catalog, environment = process.env) => {
  const configuredOrigin = String(
    environment.PUBLIC_SITE_ORIGIN || catalog.site.canonicalOrigin,
  ).replace(/\/+$/u, '');
  return (
    environment.VERCEL_ENV === 'production' &&
    configuredOrigin === catalog.site.canonicalOrigin
  );
};

export const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');



export const localePath = (page, locale) => {
  const segments = [locale.segment, page.slug].filter(Boolean);
  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
};

const SYSTEM_SLUGS = {
  'not-found': '404.html',
  error: 'error',
  offline: 'offline',
};

export const systemPath = (routeId, locale) =>
  `/${[locale.segment, SYSTEM_SLUGS[routeId]].filter(Boolean).join('/')}`;

export const canonicalUrl = (catalog, pathname) =>
  new URL(pathname, catalog.site.canonicalOrigin).toString();

export const pageCopy = (page, locale) => page.copy[locale.contentSource];
export const uiCopy = (catalog, locale) => catalog.ui[locale.contentSource];
export const systemCopy = (catalog, routeId, locale) =>
  catalog.systemPages[routeId][locale.contentSource];

export const validateCatalog = (catalog) => {
  const failures = [];
  if (!String(catalog.site?.canonicalOrigin).startsWith('https://')) {
    failures.push('site.canonicalOrigin must be HTTPS');
  }
  if (catalog.locales?.length !== 12) failures.push('exactly 12 locales are required');
  if (catalog.pages?.length !== 10) failures.push('exactly 10 public pages are required');

  const localeCodes = new Set();
  for (const locale of catalog.locales || []) {
    if (localeCodes.has(locale.code)) failures.push(`duplicate locale: ${locale.code}`);
    localeCodes.add(locale.code);
    if (locale.contentSource !== locale.code) {
      failures.push(`locale alias is forbidden: ${locale.code} -> ${locale.contentSource}`);
    }
    if (!catalog.ui?.[locale.contentSource]) {
      failures.push(`missing UI copy source: ${locale.contentSource}`);
    }
  }

  const pageIds = new Set();
  for (const page of catalog.pages || []) {
    if (pageIds.has(page.id)) failures.push(`duplicate page id: ${page.id}`);
    pageIds.add(page.id);
    const englishCopy = page.copy.en;
    for (const locale of catalog.locales || []) {
      const copy = pageCopy(page, locale);
      if (
        !copy?.seoTitle?.trim() ||
        !copy.description?.trim() ||
        !copy.heading?.trim() ||
        !copy.introduction?.trim() ||
        !Array.isArray(copy.sections)
      ) {
        failures.push(`invalid page copy: ${page.id}/${locale.code}`);
      }
      if (copy && englishCopy) {
        if (copy.sections.length !== englishCopy.sections.length) {
          failures.push(`section parity: ${page.id}/${locale.code}`);
        }
        if ((copy.faq?.length || 0) !== (englishCopy.faq?.length || 0)) {
          failures.push(`FAQ parity: ${page.id}/${locale.code}`);
        }
        if (
          locale.code !== 'en' &&
          (copy.seoTitle === englishCopy.seoTitle ||
            copy.description === englishCopy.description ||
            copy.heading === englishCopy.heading ||
            JSON.stringify(copy) === JSON.stringify(englishCopy))
        ) {
          failures.push(`English clone detected: ${page.id}/${locale.code}`);
        }
      }
    }
  }

  for (const routeId of Object.keys(SYSTEM_SLUGS)) {
    for (const locale of catalog.locales || []) {
      const copy = systemCopy(catalog, routeId, locale);
      if (!copy?.seoTitle || !copy.description || !copy.heading || !copy.body) {
        failures.push(`invalid system copy: ${routeId}/${locale.code}`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(`Public catalog validation failed:\n${failures.join('\n')}`);
  }
};

const renderNavigationLinks = (catalog, locale, currentPage, navigationOnly) =>
  catalog.pages
    .filter((page) => !navigationOnly || page.navigation)
    .map((page) => {
      const copy = pageCopy(page, locale);
      const current = page.id === currentPage?.id ? ' aria-current="page"' : '';
      return `<a href="${escapeHtml(localePath(page, locale))}"${current}>${escapeHtml(copy.navigationLabel)}</a>`;
    })
    .join('');

const renderLocaleLinks = (catalog, locale, page, systemRouteId) =>
  catalog.locales
    .map((candidate) => {
      const href = page
        ? localePath(page, candidate)
        : systemPath(systemRouteId, candidate);
      const current = candidate.code === locale.code ? ' aria-current="page"' : '';
      return `<li><a href="${escapeHtml(href)}" hreflang="${escapeHtml(candidate.htmlLang)}"${current}>${escapeHtml(candidate.label)}</a></li>`;
    })
    .join('');

const renderHeader = (catalog, locale, page, systemRouteId) => {
  const ui = uiCopy(catalog, locale);
  const home = localePath(catalog.pages[0], locale);
  const primaryLinks = renderNavigationLinks(catalog, locale, page, true);
  return `<a class="public-skip-link" href="#public-main">${escapeHtml(ui.skipToContentLabel)}</a>
<header class="public-header"><div class="public-header__inner">
<a class="public-brand" href="${escapeHtml(home)}"><span class="public-brand__mark" aria-hidden="true">FO</span><span>${escapeHtml(catalog.site.brandName)}</span></a>
<nav class="public-navigation public-navigation--desktop" aria-label="${escapeHtml(ui.primaryNavigationLabel)}">${primaryLinks}</nav>
<div class="public-header__actions">
<details class="public-language-menu"><summary><span class="public-language-menu__prefix">${escapeHtml(ui.languageLabel)}: </span><span>${escapeHtml(locale.label)}</span></summary><ul>${renderLocaleLinks(catalog, locale, page, systemRouteId)}</ul></details>
<a class="public-button public-button--small" href="${escapeHtml(catalog.site.applicationPath)}">${escapeHtml(ui.openApplicationLabel)}</a>
<details class="public-mobile-menu"><summary><span class="public-mobile-menu__icon" aria-hidden="true">☰</span><span class="public-mobile-menu__label">${escapeHtml(ui.mobileNavigationLabel)}</span></summary><nav aria-label="${escapeHtml(ui.primaryNavigationLabel)}">${primaryLinks}</nav></details>
</div></div></header>`;
};

const renderFooter = (catalog, locale, currentPage) => {
  const ui = uiCopy(catalog, locale);
  const footerIds = new Set([
    'about',
    'how-it-works',
    'features',
    'faq',
    'contact',
    'privacy',
    'terms',
  ]);
  const links = catalog.pages
    .filter((page) => footerIds.has(page.id))
    .map((page) => {
      const current = page.id === currentPage?.id ? ' aria-current="page"' : '';
      return `<a href="${escapeHtml(localePath(page, locale))}"${current}>${escapeHtml(pageCopy(page, locale).navigationLabel)}</a>`;
    })
    .join('');
  return `<footer class="public-footer"><div class="public-footer__inner"><div>
<a class="public-brand" href="${escapeHtml(localePath(catalog.pages[0], locale))}"><span class="public-brand__mark" aria-hidden="true">FO</span><span>${escapeHtml(catalog.site.brandName)}</span></a>
<p>${escapeHtml(ui.footerTagline)}</p></div>
<nav aria-label="${escapeHtml(ui.footerNavigationLabel)}">${links}</nav></div>
<p class="public-footer__legal">© 2026 ${escapeHtml(catalog.site.brandName)}. ${escapeHtml(ui.allRightsReservedLabel)}</p></footer>`;
};

const renderSections = (copy) => {
  const sections = copy.sections
    .map((section) => {
      const paragraphs = section.paragraphs
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join('');
      const bullets = section.bullets
        ? `<ul>${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>`
        : '';
      return `<section class="public-content-card"><h2>${escapeHtml(section.heading)}</h2>${paragraphs}${bullets}</section>`;
    })
    .join('');
  return sections ? `<div class="public-section-grid">${sections}</div>` : '';
};

const renderFaq = (copy) => {
  if (!copy.faq) return '';
  return `<section class="public-faq" aria-labelledby="public-faq-heading"><h2 id="public-faq-heading">${escapeHtml(copy.navigationLabel)}</h2><dl>${copy.faq
    .map(
      (item) =>
        `<div class="public-faq__item"><dt>${escapeHtml(item.question)}</dt><dd>${escapeHtml(item.answer)}</dd></div>`,
    )
    .join('')}</dl></section>`;
};

const renderPageMain = (catalog, locale, page) => {
  const copy = pageCopy(page, locale);
  const ui = uiCopy(catalog, locale);
  const howItWorks = catalog.pages.find((candidate) => candidate.id === 'how-it-works');
  const secondaryAction =
    page.id === 'how-it-works'
      ? ''
      : `<a class="public-button public-button--secondary" href="${escapeHtml(localePath(howItWorks, locale))}">${escapeHtml(ui.learnMoreLabel)}</a>`;
  return `<main id="public-main" class="public-main"><section class="public-hero"><div class="public-hero__content">
<p class="public-eyebrow">${escapeHtml(copy.eyebrow)}</p><h1>${escapeHtml(copy.heading)}</h1>
<p class="public-hero__introduction">${escapeHtml(copy.introduction)}</p>
<div class="public-hero__actions"><a class="public-button" href="${escapeHtml(catalog.site.applicationPath)}">${escapeHtml(ui.openApplicationLabel)}</a>${secondaryAction}</div></div>
<div class="public-hero__visual" aria-hidden="true"><span class="public-order-card public-order-card--one"></span><span class="public-order-card public-order-card--two"></span><span class="public-order-card public-order-card--three"></span></div>
</section>${renderSections(copy)}${renderFaq(copy)}</main>`;
};

const renderSystemMain = (catalog, locale, routeId) => {
  const copy = systemCopy(catalog, routeId, locale);
  const ui = uiCopy(catalog, locale);
  return `<main id="public-main" class="public-main public-system-page"><p class="public-system-page__code" aria-hidden="true">···</p><h1>${escapeHtml(copy.heading)}</h1><p>${escapeHtml(copy.body)}</p><a class="public-button" href="${escapeHtml(localePath(catalog.pages[0], locale))}">${escapeHtml(ui.backHomeLabel)}</a></main>`;
};

const structuredData = (catalog, locale, page) => {
  const copy = pageCopy(page, locale);
  const canonical = canonicalUrl(catalog, localePath(page, locale));
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: catalog.site.brandName,
      url: catalog.site.canonicalOrigin,
      logo: canonicalUrl(catalog, '/icon.svg'),
      sameAs: [catalog.site.repositoryUrl],
    },
  ];
  if (page.id === 'home') {
    data.push(
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: catalog.site.brandName,
        url: catalog.site.canonicalOrigin,
        inLanguage: locale.htmlLang,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: catalog.site.brandName,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web, Android, iOS',
        description: copy.description,
        url: canonical,
      },
    );
  } else {
    data.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: pageCopy(catalog.pages[0], locale).navigationLabel,
          item: canonicalUrl(catalog, localePath(catalog.pages[0], locale)),
        },
        { '@type': 'ListItem', position: 2, name: copy.heading, item: canonical },
      ],
    });
  }
  if (page.id === 'faq' && copy.faq) {
    data.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: copy.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    });
  }
  return data;
};

const renderHead = ({ catalog, locale, page, stylesheetLinks, indexable }) => {
  const copy = pageCopy(page, locale);
  const canonical = canonicalUrl(catalog, localePath(page, locale));
  const robots = indexable
    ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    : 'noindex, nofollow, noarchive';
  const alternates = [
    ...catalog.locales.map(
      (candidate) =>
        `<link rel="alternate" hreflang="${escapeHtml(candidate.htmlLang)}" href="${escapeHtml(canonicalUrl(catalog, localePath(page, candidate)))}" />`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl(catalog, localePath(page, catalog.locales[0])))}" />`,
  ].join('\n');
  const jsonLd = structuredData(catalog, locale, page)
    .map(
      (entry) =>
        `<script type="application/ld+json">${JSON.stringify(entry).replaceAll('<', '\\u003c')}</script>`,
    )
    .join('\n');
  const image = canonicalUrl(catalog, catalog.site.socialImagePath);
  return `<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#f97316" />
<meta name="robots" content="${robots}" />
<meta name="googlebot" content="${robots}" />
<title>${escapeHtml(copy.seoTitle)}</title>
<meta name="description" content="${escapeHtml(copy.description)}" />
<link rel="canonical" href="${escapeHtml(canonical)}" />
${alternates}
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${escapeHtml(catalog.site.brandName)}" />
<meta property="og:locale" content="${escapeHtml(locale.openGraphLocale)}" />
<meta property="og:title" content="${escapeHtml(copy.seoTitle)}" />
<meta property="og:description" content="${escapeHtml(copy.description)}" />
<meta property="og:url" content="${escapeHtml(canonical)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${escapeHtml(copy.heading)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(copy.seoTitle)}" />
<meta name="twitter:description" content="${escapeHtml(copy.description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
<meta name="twitter:image:alt" content="${escapeHtml(copy.heading)}" />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
${stylesheetLinks.join('\n')}
${jsonLd}`;
};

const renderSystemHead = (catalog, locale, routeId, stylesheetLinks) => {
  const copy = systemCopy(catalog, routeId, locale);
  return `<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#f97316" />
<meta name="robots" content="noindex, nofollow, noarchive" />
<meta name="googlebot" content="noindex, nofollow, noarchive" />
<title>${escapeHtml(copy.seoTitle)}</title>
<meta name="description" content="${escapeHtml(copy.description)}" />
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
${stylesheetLinks.join('\n')}`;
};

export const extractStylesheetLinks = (viteHtml) =>
  [...viteHtml.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/giu)].map(
    (match) => match[0],
  );

export const renderPublicDocument = ({
  catalog,
  locale,
  page,
  stylesheetLinks,
  indexable,
}) => `<!doctype html>
<html class="public-document" lang="${escapeHtml(locale.htmlLang)}" dir="${locale.direction}">
<head>
${renderHead({ catalog, locale, page, stylesheetLinks, indexable })}
</head>
<body>
<div id="root" data-public-prerendered="true"><div class="public-site" role="document" aria-label="${escapeHtml(catalog.site.brandName)}" lang="${escapeHtml(locale.htmlLang)}" dir="${locale.direction}" data-ad-eligible="${page.adEligible ? 'true' : 'false'}">
${renderHeader(catalog, locale, page, 'not-found')}
${renderPageMain(catalog, locale, page)}
${renderFooter(catalog, locale, page)}
</div></div>
</body>
</html>
`;

export const renderSystemDocument = ({
  catalog,
  locale,
  routeId,
  stylesheetLinks,
}) => `<!doctype html>
<html class="public-document" lang="${escapeHtml(locale.htmlLang)}" dir="${locale.direction}">
<head>
${renderSystemHead(catalog, locale, routeId, stylesheetLinks)}
</head>
<body>
<div id="root" data-public-prerendered="true"><div class="public-site" role="document" aria-label="${escapeHtml(catalog.site.brandName)}" lang="${escapeHtml(locale.htmlLang)}" dir="${locale.direction}" data-ad-eligible="false">
${renderHeader(catalog, locale, null, routeId)}
${renderSystemMain(catalog, locale, routeId)}
${renderFooter(catalog, locale, null)}
</div></div>
</body>
</html>
`;

export const outputPathForPage = (outputDirectory, page, locale) => {
  const segments = [locale.segment, page.slug].filter(Boolean);
  return path.join(outputDirectory, ...segments, 'index.html');
};

export const outputPathForSystemPage = (outputDirectory, routeId, locale) => {
  if (routeId === 'not-found') {
    return path.join(outputDirectory, locale.segment, '404.html');
  }
  return path.join(outputDirectory, locale.segment, SYSTEM_SLUGS[routeId], 'index.html');
};

export const buildSitemap = (catalog) => {
  const entries = [];
  for (const page of catalog.pages) {
    for (const locale of catalog.locales) {
      const location = canonicalUrl(catalog, localePath(page, locale));
      const alternates = [
        ...catalog.locales.map(
          (candidate) =>
            `<xhtml:link rel="alternate" hreflang="${escapeHtml(candidate.htmlLang)}" href="${escapeHtml(canonicalUrl(catalog, localePath(page, candidate)))}" />`,
        ),
        `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl(catalog, localePath(page, catalog.locales[0])))}" />`,
      ].join('');
      entries.push(`<url><loc>${escapeHtml(location)}</loc>${alternates}</url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join('')}</urlset>\n`;
};

export const buildRobots = (catalog, indexable) =>
  indexable
    ? `User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /auth\nDisallow: /invite\nDisallow: /buckets\nDisallow: /sessions\nDisallow: /orders\nDisallow: /join\nDisallow: /social\nDisallow: /settings\n\nSitemap: ${catalog.site.canonicalOrigin}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n';
