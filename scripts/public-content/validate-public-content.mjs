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
    if (/<script\b[^>]*\bsrc=/iu.test(html)) failures.push(`client script: ${page.id}/${key}`);
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
if (/<script[^>]*\bsrc="https:\/\/pagead2\.googlesyndication\.com\//iu.test(appShell)) {
  failures.push('app shell contains AdSense loader');
}

const sitemap = await readFile(path.join(outputDirectory, 'sitemap.xml'), 'utf8').catch(
  () => '',
);
if ((sitemap.match(/<url>/gu) || []).length !== 120) failures.push('sitemap URL count');
for (const privatePrefix of ['/app', '/auth', '/invite', '/buckets', '/orders', '/sessions']) {
  if (sitemap.includes(`<loc>${catalog.site.canonicalOrigin}${privatePrefix}`)) {
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

process.stdout.write('Public artifact validation passed for 120 localized pages.\n');
