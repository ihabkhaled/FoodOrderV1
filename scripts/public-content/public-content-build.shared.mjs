import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export const PUBLIC_CATALOG_PATH = path.join(
  'src',
  'modules',
  'public-content',
  'content',
  'public-content.catalog.json',
);
const CONTACT_FORM_PATH = path.join(
  'src',
  'modules',
  'public-content',
  'content',
  'contact-form.locales.json',
);
const ENGLISH_HOME_COPY_PATH = path.join(
  'src',
  'modules',
  'public-content',
  'content',
  'english-home-copy.json',
);

export const loadPublicCatalog = async (root = process.cwd()) => {
  const baseCatalog = JSON.parse(
    await readFile(path.join(root, PUBLIC_CATALOG_PATH), 'utf8'),
  );
  baseCatalog.contactForm = JSON.parse(
    await readFile(path.join(root, CONTACT_FORM_PATH), 'utf8'),
  );
  const englishHomeCopy = JSON.parse(
    await readFile(path.join(root, ENGLISH_HOME_COPY_PATH), 'utf8'),
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
  const homePage = catalog.pages.find((page) => page.id === 'home');
  if (!homePage) throw new Error('Missing public page: home');
  homePage.copy.en = englishHomeCopy;
  catalog.ui.en = {
    ...catalog.ui.en,
    brandName: catalog.site.brandName,
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

export const escapeXml = (value) =>
  escapeHtml(String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, ''));


export const localePath = (page, locale) => {
  const segments = [locale.segment, page.slug].filter(Boolean);
  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
};

export const localizedApplicationPath = (catalog, locale) =>
  `/${locale.segment}${catalog.site.applicationPath}`;

const SYSTEM_SLUGS = {
  'not-found': '404.html',
  error: 'error',
  offline: 'offline',
};

export const systemPath = (routeId, locale) =>
  `/${[locale.segment, SYSTEM_SLUGS[routeId]].filter(Boolean).join('/')}`;

export const canonicalUrl = (catalog, pathname) =>
  new URL(pathname, catalog.site.canonicalOrigin).toString();

/**
 * The Open Graph and Twitter tags that turn a pasted link into a titled card
 * with a description and the logo.
 *
 * Chat apps and social networks read these straight from the served HTML and
 * never run the bundle, so a document without them shares as a bare URL. That
 * made the application shell the worst offender: `/app` is the link people
 * actually paste, and it was the one page with no card at all.
 */
export const renderSocialCard = ({
  catalog,
  locale,
  title,
  description,
  url,
  imageAlt = title,
}) => {
  const image = canonicalUrl(catalog, catalog.site.socialImagePath);
  return `<meta property="og:type" content="website" />
<meta property="og:site_name" content="${escapeHtml(uiCopy(catalog, locale).brandName)}" />
<meta property="og:locale" content="${escapeHtml(locale.openGraphLocale)}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:image:secure_url" content="${escapeHtml(image)}" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
<meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />`;
};

export const pageCopy = (page, locale) => page.copy[locale.contentSource];
export const uiCopy = (catalog, locale) => catalog.ui[locale.contentSource];
export const systemCopy = (catalog, routeId, locale) =>
  catalog.systemPages[routeId][locale.contentSource];

export const validateCatalog = (catalog) => {
  const failures = [];
  if (!String(catalog.site?.canonicalOrigin).startsWith('https://')) {
    failures.push('site.canonicalOrigin must be HTTPS');
  }
  if (catalog.locales?.length !== 13) failures.push('exactly 13 locales are required');
  // A minimum, not a fixed count: guides are added over time. The floor still
  // catches a catalogue that lost pages.
  if ((catalog.pages?.length ?? 0) < 10) failures.push('at least 10 public pages are required');

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

const GLOBE_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/></svg>';

const renderHeader = (catalog, locale, page, systemRouteId) => {
  const ui = uiCopy(catalog, locale);
  const home = localePath(catalog.pages[0], locale);
  const primaryLinks = renderNavigationLinks(catalog, locale, page, true);
  return `<a class="public-skip-link" href="#public-main">${escapeHtml(ui.skipToContentLabel)}</a>
<header class="public-header"><div class="public-header__inner">
<a class="public-brand" href="${escapeHtml(home)}"><span class="public-brand__mark" aria-hidden="true">FO</span><span>${escapeHtml(uiCopy(catalog, locale).brandName)}</span></a>
<nav class="public-navigation public-navigation--desktop" aria-label="${escapeHtml(ui.primaryNavigationLabel)}">${primaryLinks}</nav>
<div class="public-header__actions">
<details class="public-language-menu"><summary><span class="public-language-menu__globe" aria-hidden="true">${GLOBE_ICON}</span><span class="public-language-menu__prefix">${escapeHtml(ui.languageLabel)}: </span><span>${escapeHtml(locale.label)}</span></summary><ul>${renderLocaleLinks(catalog, locale, page, systemRouteId)}</ul></details>
<button class="public-theme-toggle" type="button" data-public-theme-toggle aria-label="${escapeHtml(ui.themeToggleLabel)}" title="${escapeHtml(ui.themeToggleLabel)}" aria-pressed="false"><span class="public-theme-toggle__icon" aria-hidden="true"></span></button>
<a class="public-auth-link" href="${escapeHtml(`${localizedApplicationPath(catalog, locale).replace(/\/app$/u, '')}/auth/login`)}">${escapeHtml(ui.signInLabel)}</a>
<a class="public-auth-link" href="${escapeHtml(`${localizedApplicationPath(catalog, locale).replace(/\/app$/u, '')}/auth/register`)}">${escapeHtml(ui.signUpLabel)}</a>
<a class="public-button public-button--small" href="${escapeHtml(localizedApplicationPath(catalog, locale))}">${escapeHtml(ui.openApplicationLabel)}</a>
<details class="public-mobile-menu"><summary><span class="public-mobile-menu__icon" aria-hidden="true">☰</span><span class="public-mobile-menu__label">${escapeHtml(ui.mobileNavigationLabel)}</span></summary><nav aria-label="${escapeHtml(ui.primaryNavigationLabel)}">${primaryLinks}</nav></details>
</div></div></header>`;
};

const renderFooter = (catalog, locale, currentPage) => {
  const ui = uiCopy(catalog, locale);
  // Guides are listed here as well as in the sitemap. A page reachable only
  // from a sitemap is an orphan: readers never find it and crawlers weigh it
  // accordingly, which defeats the point of writing it.
  const footerIds = new Set([
    'about',
    'how-it-works',
    'features',
    'create-a-menu',
    'share-a-menu',
    'run-an-order-round',
    'invite-friends',
    'work-with-groups',
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
  const feedPath = `/${[locale.segment, 'feed.xml'].filter(Boolean).join('/')}`;
  return `<footer class="public-footer"><div class="public-footer__inner"><div>
<a class="public-brand" href="${escapeHtml(localePath(catalog.pages[0], locale))}"><span class="public-brand__mark" aria-hidden="true">FO</span><span>${escapeHtml(uiCopy(catalog, locale).brandName)}</span></a>
<p>${escapeHtml(ui.footerTagline)}</p></div>
<nav aria-label="${escapeHtml(ui.footerNavigationLabel)}">${links}<a href="${escapeHtml(feedPath)}">RSS</a></nav></div>
<p class="public-footer__legal">© 2026 ${escapeHtml(uiCopy(catalog, locale).brandName)}. ${escapeHtml(ui.allRightsReservedLabel)}</p></footer>`;
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

const renderContactForm = (catalog, locale, page) => {
  if (page.id !== 'contact') return '';
  const copy = catalog.contactForm[locale.code];
  return `<section class="public-contact" aria-labelledby="public-contact-heading"><h2 id="public-contact-heading">${escapeHtml(copy.heading)}</h2><form class="public-contact__form" action="/api/contact" method="post"><label>${escapeHtml(copy.name)}<input name="name" autocomplete="name" maxlength="120" required /></label><label>${escapeHtml(copy.email)}<input name="email" type="email" autocomplete="email" maxlength="200" required /></label><label>${escapeHtml(copy.subject)}<input name="subject" maxlength="200" required /></label><label>${escapeHtml(copy.message)}<textarea name="message" maxlength="5000" rows="7" required></textarea></label><label class="public-contact__honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off" /></label><input type="hidden" name="locale" value="${escapeHtml(locale.code)}" /><p>${escapeHtml(copy.privacy)}</p><p class="public-contact__success" role="status" hidden>${escapeHtml(copy.success)}</p><p class="public-contact__error" role="alert" hidden>${escapeHtml(copy.error)}</p><button class="public-button" type="submit">${escapeHtml(copy.submit)}</button></form></section><script>(()=>{const form=document.querySelector(".public-contact__form");const success=form.querySelector('[role="status"]');const error=form.querySelector('[role="alert"]');const button=form.querySelector('button[type="submit"]');form.addEventListener("submit",async(event)=>{event.preventDefault();success.hidden=true;error.hidden=true;button.disabled=true;try{const response=await fetch(form.action,{method:"POST",body:new FormData(form),headers:{Accept:"application/json"}});if(!response.ok)throw new Error("contact submission failed");form.reset();success.hidden=false}catch{error.hidden=false}finally{button.disabled=false}})})()</script>`;
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
<div class="public-hero__actions"><a class="public-button" href="${escapeHtml(localizedApplicationPath(catalog, locale))}">${escapeHtml(ui.openApplicationLabel)}</a>${secondaryAction}</div></div>
<div class="public-hero__visual" aria-hidden="true"><span class="public-order-card public-order-card--one"></span><span class="public-order-card public-order-card--two"></span><span class="public-order-card public-order-card--three"></span></div>
</section>${renderSections(copy)}${renderFaq(copy)}${renderContactForm(catalog, locale, page)}</main>`;
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
      name: uiCopy(catalog, locale).brandName,
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
        name: uiCopy(catalog, locale).brandName,
        url: catalog.site.canonicalOrigin,
        inLanguage: locale.htmlLang,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: uiCopy(catalog, locale).brandName,
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
  // Any page carrying question-and-answer pairs earns FAQ structured data,
  // not just the FAQ page: the guides answer real questions and should be
  // eligible for the same rich result.
  if (copy.faq?.length) {
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

/**
 * Google AdSense loader, driven by the same `ADSENSE_PUBLISHER_ID` that writes
 * `ads.txt`, so the two can never disagree.
 *
 * Only indexable production pages carry it: the app shell is noindex and sits
 * behind a login, and `validate-public-content.mjs` fails the build if the
 * loader ever leaks into it. Google rotates this file continuously and
 * publishes no hash, so it intentionally carries no `integrity` attribute —
 * that is the official snippet.
 */
export const adsensePublisherId = (environment = process.env) => {
  const id = String(environment.ADSENSE_PUBLISHER_ID || '').trim();
  return /^pub-\d{16}$/u.test(id) ? id : null;
};

const adsenseScript = (publisherId) =>
  `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${publisherId}" crossorigin="anonymous"></script>`;

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
  const feedUrl = canonicalUrl(
    catalog,
    `/${[locale.segment, 'feed.xml'].filter(Boolean).join('/')}`,
  );
  return `<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<script>try{var t=localStorage.getItem("foodorder:public:theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}</script>
<meta name="theme-color" content="#f97316" />
<meta name="robots" content="${robots}" />
<meta name="googlebot" content="${robots}" />
<title>${escapeHtml(copy.seoTitle)}</title>
<meta name="description" content="${escapeHtml(copy.description)}" />
<link rel="canonical" href="${escapeHtml(canonical)}" />
${alternates}
${renderSocialCard({
    catalog,
    locale,
    title: copy.seoTitle,
    description: copy.description,
    url: canonical,
    imageAlt: copy.heading,
  })}
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(`${uiCopy(catalog, locale).brandName} — ${locale.label}`)}" href="${escapeHtml(feedUrl)}" />
${stylesheetLinks.join('\n')}
${jsonLd}
${indexable && adsensePublisherId() ? adsenseScript(adsensePublisherId()) : ''}`;
};

const renderSystemHead = (catalog, locale, routeId, stylesheetLinks) => {
  const copy = systemCopy(catalog, routeId, locale);
  return `<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<script>try{var t=localStorage.getItem("foodorder:public:theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}</script>
<meta name="theme-color" content="#f97316" />
<meta name="robots" content="noindex, nofollow, noarchive" />
<meta name="googlebot" content="noindex, nofollow, noarchive" />
<title>${escapeHtml(copy.seoTitle)}</title>
<meta name="description" content="${escapeHtml(copy.description)}" />
${renderSocialCard({
    catalog,
    locale,
    title: copy.seoTitle,
    description: copy.description,
    url: canonicalUrl(catalog, systemPath(routeId, locale)),
  })}
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
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
<div id="root" data-public-prerendered="true"><div class="public-site" role="document" aria-label="${escapeHtml(uiCopy(catalog, locale).brandName)}" lang="${escapeHtml(locale.htmlLang)}" dir="${locale.direction}" data-ad-eligible="${page.adEligible ? 'true' : 'false'}">
${renderHeader(catalog, locale, page, 'not-found')}
${renderPageMain(catalog, locale, page)}
${renderFooter(catalog, locale, page)}
</div></div>
<script>(function(){var b=document.querySelector("[data-public-theme-toggle]");if(!b)return;var r=document.documentElement;function cur(){var a=r.dataset.theme;return a==="dark"||a==="light"?a:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}function sync(){b.setAttribute("aria-pressed",String(cur()==="dark"))}sync();b.addEventListener("click",function(){var n=cur()==="dark"?"light":"dark";r.dataset.theme=n;try{localStorage.setItem("foodorder:public:theme",n)}catch(e){}sync()})})()</script>
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
<div id="root" data-public-prerendered="true"><div class="public-site" role="document" aria-label="${escapeHtml(uiCopy(catalog, locale).brandName)}" lang="${escapeHtml(locale.htmlLang)}" dir="${locale.direction}" data-ad-eligible="false">
${renderHeader(catalog, locale, null, routeId)}
${renderSystemMain(catalog, locale, routeId)}
${renderFooter(catalog, locale, null)}
</div></div>
<script>(function(){var b=document.querySelector("[data-public-theme-toggle]");if(!b)return;var r=document.documentElement;function cur(){var a=r.dataset.theme;return a==="dark"||a==="light"?a:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}function sync(){b.setAttribute("aria-pressed",String(cur()==="dark"))}sync();b.addEventListener("click",function(){var n=cur()==="dark"?"light":"dark";r.dataset.theme=n;try{localStorage.setItem("foodorder:public:theme",n)}catch(e){}sync()})})()</script>
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

export const buildLocaleSitemap = (catalog, locale) => {
  const entries = [];
  for (const page of catalog.pages) {
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
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join('')}</urlset>\n`;
};

export const buildSitemapIndex = (catalog) => {
  const entries = catalog.locales
    .map((locale) => {
      const name = locale.segment || 'en';
      return `<sitemap><loc>${escapeXml(canonicalUrl(catalog, `/sitemaps/${name}.xml`))}</loc></sitemap>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>\n`;
};

export const buildRssFeed = (catalog, locale) => {
  const selfPath = `/${[locale.segment, 'feed.xml'].filter(Boolean).join('/')}`;
  const items = [...catalog.pages]
    .slice(0, 50)
    .map((page) => {
      const copy = pageCopy(page, locale);
      const url = canonicalUrl(catalog, localePath(page, locale));
      return `<item><title>${escapeXml(copy.seoTitle)}</title><description>${escapeXml(copy.description)}</description><link>${escapeXml(url)}</link><guid isPermaLink="true">${escapeXml(url)}</guid><category>${escapeXml(copy.navigationLabel)}</category></item>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${escapeXml(`${uiCopy(catalog, locale).brandName} — ${locale.label}`)}</title><link>${escapeXml(canonicalUrl(catalog, localePath(catalog.pages[0], locale)))}</link><description>${escapeXml(uiCopy(catalog, locale).footerTagline)}</description><language>${escapeXml(locale.htmlLang)}</language><atom:link href="${escapeXml(canonicalUrl(catalog, selfPath))}" rel="self" type="application/rss+xml" />${items}</channel></rss>\n`;
};

export const buildRobots = (catalog, indexable) => {
  if (!indexable) return 'User-agent: *\nDisallow: /\n';
  const privatePaths = [
    'app',
    'auth',
    'invite',
    'buckets',
    'sessions',
    'orders',
    'join',
    'social',
    'settings',
  ];
  const disallowRules = ['', ...catalog.locales.map((locale) => locale.segment)]
    .flatMap((segment) =>
      privatePaths.map(
        (privatePath) =>
          `Disallow: /${[segment, privatePath].filter(Boolean).join('/')}`,
      ),
    )
    .join('\n');
  return `User-agent: *\nAllow: /\n${disallowRules}\n\nSitemap: ${catalog.site.canonicalOrigin}/sitemap.xml\n`;
};
