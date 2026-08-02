#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  canonicalUrl,
  escapeHtml,
  isProductionIndexingEnabled,
  loadPublicCatalog,
  localePath,
  outputPathForPage,
  outputPathForSystemPage,
  pageCopy,
  validateCatalog,
} from './public-content-build.shared.mjs';

const outputArgument = process.argv.find((argument) => argument.startsWith('--out-dir='));
const root = process.cwd();
const outputDirectory = path.resolve(
  root,
  outputArgument?.slice('--out-dir='.length) || 'dist',
);
const catalog = await loadPublicCatalog(root);
validateCatalog(catalog);
const indexable = isProductionIndexingEnabled(catalog);
const failures = [];
const titlesByLocale = new Map();
const descriptionsByLocale = new Map();

// Deliberately not global: a second copy would survive the single replacement
// below and be reported as an unsanctioned client script, which is what a
// duplicated loader deserves.
const ADSENSE_LOADER =
  /<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-\d{16}" crossorigin="anonymous"><\/script>/u;

const expectIncludes = (html, value, label) => {
  if (!html.includes(value)) failures.push(label);
};

for (const page of catalog.pages) {
  for (const locale of catalog.locales) {
    const filePath = outputPathForPage(outputDirectory, page, locale);
    const html = await readFile(filePath, 'utf8').catch(() => '');
    const copy = pageCopy(page, locale);
    const key = locale.code;
    const titles = titlesByLocale.get(key) || new Set();
    const descriptions = descriptionsByLocale.get(key) || new Set();
    if (titles.has(copy.seoTitle)) failures.push(`duplicate title in ${key}: ${copy.seoTitle}`);
    if (descriptions.has(copy.description)) {
      failures.push(`duplicate description in ${key}: ${copy.description}`);
    }
    titles.add(copy.seoTitle);
    descriptions.add(copy.description);
    titlesByLocale.set(key, titles);
    descriptionsByLocale.set(key, descriptions);

    expectIncludes(html, `<html class="public-document" lang="${locale.htmlLang}" dir="${locale.direction}">`, `html locale: ${page.id}/${key}`);
    expectIncludes(html, `<title>${escapeHtml(copy.seoTitle)}</title>`, `title: ${page.id}/${key}`);
    expectIncludes(html, `<h1>${escapeHtml(copy.heading)}</h1>`, `h1: ${page.id}/${key}`);
    expectIncludes(html, `rel="canonical" href="${canonicalUrl(catalog, localePath(page, locale))}"`, `canonical: ${page.id}/${key}`);
    expectIncludes(html, 'property="og:image:width" content="1200"', `OG width: ${page.id}/${key}`);
    expectIncludes(html, 'property="og:image:height" content="630"', `OG height: ${page.id}/${key}`);
    expectIncludes(html, 'name="twitter:card" content="summary_large_image"', `Twitter card: ${page.id}/${key}`);
    expectIncludes(html, 'data-public-prerendered="true"', `prerender marker: ${page.id}/${key}`);
    // No third-party JavaScript on the public site, with exactly one sanctioned
    // exception: the AdSense loader, which only an indexable production build
    // emits. Removing it before the test keeps every other external script
    // banned instead of loosening the pattern.
    const withoutSanctionedScripts = html.replace(ADSENSE_LOADER, '');
    if (/<script\b[^>]*\bsrc=/iu.test(withoutSanctionedScripts)) {
      failures.push(`client script: ${page.id}/${key}`);
    }
    if (!indexable && ADSENSE_LOADER.test(html)) {
      failures.push(`ad loader outside production: ${page.id}/${key}`);
    }
    if ((html.match(/<h1\b/giu) || []).length !== 1) failures.push(`H1 count: ${page.id}/${key}`);
    if ((html.match(/hreflang=/giu) || []).length < 25) failures.push(`hreflang set: ${page.id}/${key}`);
    const expectedRobots = indexable ? 'index, follow' : 'noindex, nofollow';
    expectIncludes(html, `content="${expectedRobots}`, `robots: ${page.id}/${key}`);
  }
}

for (const routeId of ['not-found', 'error', 'offline']) {
  for (const locale of catalog.locales) {
    const html = await readFile(
      outputPathForSystemPage(outputDirectory, routeId, locale),
      'utf8',
    ).catch(() => '');
    expectIncludes(html, 'noindex, nofollow, noarchive', `system noindex: ${routeId}/${locale.code}`);
    expectIncludes(html, 'data-ad-eligible="false"', `system ads denied: ${routeId}/${locale.code}`);
  }
}

const appShell = await readFile(path.join(outputDirectory, 'app.html'), 'utf8').catch(
  () => '',
);
expectIncludes(appShell, 'noindex, nofollow, noarchive', 'app shell noindex');

// The application shell is what a crawler fetches for every shared app link, so
// its preview card is a release gate rather than a nicety.
const socialImageUrl = canonicalUrl(catalog, catalog.site.socialImagePath);
for (const [tag, value] of [
  ['og:title', `${catalog.site.brandName} App`],
  ['og:description', pageCopy(catalog.pages[0], catalog.locales[0]).description],
  ['og:url', canonicalUrl(catalog, catalog.site.applicationPath)],
  ['og:image', socialImageUrl],
  ['twitter:card', 'summary_large_image'],
  ['twitter:image', socialImageUrl],
]) {
  const attribute = tag.startsWith('og:') ? 'property' : 'name';
  expectIncludes(
    appShell,
    `<meta ${attribute}="${tag}" content="${escapeHtml(value)}" />`,
    `app shell ${tag}`,
  );
}
// A duplicate card is as broken as a missing one: crawlers pick one at random.
for (const tag of ['og:title', 'og:image', 'twitter:card']) {
  const attribute = tag.startsWith('og:') ? 'property' : 'name';
  const occurrences = (
    appShell.match(new RegExp(`<meta ${attribute}="${tag}"`, 'gu')) || []
  ).length;
  if (occurrences !== 1) failures.push(`app shell duplicate ${tag}: ${occurrences}`);
}

for (const page of catalog.pages) {
  for (const locale of catalog.locales) {
    const html = await readFile(outputPathForPage(outputDirectory, page, locale), 'utf8').catch(
      () => '',
    );
    expectIncludes(
      html,
      `<meta property="og:image" content="${escapeHtml(socialImageUrl)}" />`,
      `card image: ${page.id}/${locale.code}`,
    );
  }
}
if (/<script[^>]*\bsrc="https:\/\/pagead2\.googlesyndication\.com\//iu.test(appShell)) {
  failures.push('app shell contains AdSense loader');
}

const sitemap = await readFile(path.join(outputDirectory, 'sitemap.xml'), 'utf8').catch(
  () => '',
);
if ((sitemap.match(/<sitemap>/gu) || []).length !== catalog.locales.length) failures.push('sitemap locale count');
let sitemapUrlCount = 0;
const localeSitemaps = [];
for (const locale of catalog.locales) {
  const localeName = locale.segment || 'en';
  const localeSitemap = await readFile(
    path.join(outputDirectory, 'sitemaps', `${localeName}.xml`),
    'utf8',
  ).catch(() => '');
  localeSitemaps.push(localeSitemap);
  sitemapUrlCount += (localeSitemap.match(/<url>/gu) || []).length;
  for (const page of catalog.pages) {
    expectIncludes(
      localeSitemap,
      `<loc>${canonicalUrl(catalog, localePath(page, locale))}</loc>`,
      `sitemap route: ${locale.code}/${page.id}`,
    );
  }
  const feed = await readFile(
    path.join(outputDirectory, locale.segment, 'feed.xml'),
    'utf8',
  ).catch(() => '');
  expectIncludes(feed, '<rss version="2.0"', `RSS root: ${locale.code}`);
  expectIncludes(feed, `<language>${locale.htmlLang}</language>`, `RSS language: ${locale.code}`);
  if ((feed.match(/<item>/gu) || []).length > 50) failures.push(`RSS item limit: ${locale.code}`);
}
const expectedSitemapUrls = catalog.locales.length * catalog.pages.length;
if (sitemapUrlCount !== expectedSitemapUrls) failures.push('sitemap URL count');
const allLocaleSitemaps = localeSitemaps.join('\n');
for (const privatePrefix of [
  'app',
  'auth',
  'invite',
  'buckets',
  'orders',
  'sessions',
]) {
  if (
    catalog.locales.some((locale) =>
      allLocaleSitemaps.includes(
        `<loc>${catalog.site.canonicalOrigin}/${locale.segment}/${privatePrefix}`,
      ),
    )
  ) {
    failures.push(`private sitemap entry: ${privatePrefix}`);
  }
}

const robots = await readFile(path.join(outputDirectory, 'robots.txt'), 'utf8').catch(
  () => '',
);
expectIncludes(
  robots,
  indexable ? `Sitemap: ${catalog.site.canonicalOrigin}/sitemap.xml` : 'Disallow: /',
  'robots environment policy',
);

await access(path.join(outputDirectory, catalog.site.socialImagePath.slice(1))).catch(() => {
  failures.push('social preview image missing');
});

if (failures.length > 0) {
  throw new Error(`Public artifact validation failed:\n${failures.join('\n')}`);
}

process.stdout.write(
  `Public artifact validation passed for ${expectedSitemapUrls} localized pages.\n`,
);
