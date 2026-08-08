#!/usr/bin/env node

import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  buildRobots,
  buildLocaleSitemap,
  buildRssFeed,
  buildSitemapIndex,
  canonicalUrl,
  escapeHtml,
  extractStylesheetLinks,
  isProductionIndexingEnabled,
  loadPublicCatalog,
  outputPathForPage,
  outputPathForSystemPage,
  pageCopy,
  renderPublicDocument,
  renderSocialCard,
  renderSystemDocument,
  validateCatalog,
} from './public-content-build.shared.mjs';

const outputArgument = process.argv.find((argument) => argument.startsWith('--out-dir='));
const root = process.cwd();
const outputDirectory = path.resolve(
  root,
  outputArgument?.slice('--out-dir='.length) || 'dist',
);

const writeOutput = async (filePath, content) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
};

const catalog = await loadPublicCatalog(root);
validateCatalog(catalog);
const indexable = isProductionIndexingEnabled(catalog);
const viteIndexPath = path.join(outputDirectory, 'index.html');
const viteIndex = await readFile(viteIndexPath, 'utf8');
const stylesheetLinks = extractStylesheetLinks(viteIndex);
if (stylesheetLinks.length === 0) {
  throw new Error('Vite output did not contain the public-content stylesheet.');
}

// Every application route rewrites to this one file (see vercel.json), so it is
// the document a crawler sees for any link somebody shares out of the app.
const applicationLocale = catalog.locales[0];
const applicationTitle = `${catalog.site.brandName} App`;
const applicationDescription = pageCopy(catalog.pages[0], applicationLocale).description;
const applicationCard = renderSocialCard({
  catalog,
  locale: applicationLocale,
  title: applicationTitle,
  description: applicationDescription,
  url: canonicalUrl(catalog, catalog.site.applicationPath),
});

const appShell = viteIndex
  .replace('<div id="root"></div>', '<div id="root" data-app-shell="true"></div>')
  .replace(/<title>.*?<\/title>/su, `<title>${escapeHtml(applicationTitle)}</title>`)
  // The shell is built from index.html, which carries its own card for local
  // development. Drop it so the catalog stays the single source of truth.
  .replace(/^[ \t]*<meta\s+(?:property="og:|name="twitter:)[^>]*>\r?\n/gmu, '')
  .replace(
    /<meta\s+name="description"[^>]*>/u,
    `<meta name="description" content="${escapeHtml(applicationDescription)}" />\n${applicationCard}`,
  );
await writeOutput(path.join(outputDirectory, 'app.html'), appShell);

let publicPageCount = 0;
for (const page of catalog.pages) {
  for (const locale of catalog.locales) {
    const document = renderPublicDocument({
      catalog,
      locale,
      page,
      stylesheetLinks,
      indexable,
    });
    await writeOutput(
      outputPathForPage(outputDirectory, page, locale),
      document,
    );
    if (page.id === 'home' && locale.code === 'en') {
      await writeOutput(path.join(outputDirectory, 'index.html'), document);
    }
    publicPageCount += 1;
  }
}

for (const routeId of ['not-found', 'error', 'offline']) {
  for (const locale of catalog.locales) {
    await writeOutput(
      outputPathForSystemPage(outputDirectory, routeId, locale),
      renderSystemDocument({ catalog, locale, routeId, stylesheetLinks }),
    );
  }
}

await writeOutput(path.join(outputDirectory, 'sitemap.xml'), buildSitemapIndex(catalog));
for (const locale of catalog.locales) {
  const localeName = locale.segment || 'en';
  const feedPath = path.join(outputDirectory, locale.segment, 'feed.xml');
  await writeOutput(
    path.join(outputDirectory, 'sitemaps', `${localeName}.xml`),
    buildLocaleSitemap(catalog, locale),
  );
  const feed = buildRssFeed(catalog, locale);
  await writeOutput(feedPath, feed);
  await writeOutput(path.join(outputDirectory, locale.segment, 'feeds', 'topics.xml'), feed);
}
await writeOutput(path.join(outputDirectory, 'robots.txt'), buildRobots(catalog, indexable));

const publisherId = String(process.env.ADSENSE_PUBLISHER_ID || '').trim();
const adsPath = path.join(outputDirectory, 'ads.txt');
if (indexable && /^pub-\d{16}$/u.test(publisherId)) {
  await writeOutput(
    adsPath,
    `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`,
  );
} else {
  await unlink(adsPath).catch(() => {});
}

const socialImage = path.join(outputDirectory, catalog.site.socialImagePath.slice(1));
await access(socialImage);

process.stdout.write(
  `Generated ${publicPageCount} public documents plus localized system pages (${indexable ? 'indexable production' : 'noindex preview'}).\n`,
);
