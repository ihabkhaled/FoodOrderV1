#!/usr/bin/env node

import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  buildRobots,
  buildSitemap,
  extractStylesheetLinks,
  isProductionIndexingEnabled,
  loadPublicCatalog,
  outputPathForPage,
  outputPathForSystemPage,
  renderPublicDocument,
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

const appShell = viteIndex
  .replace('<div id="root"></div>', '<div id="root" data-app-shell="true"></div>')
  .replace(/<title>.*?<\/title>/su, '<title>Gama3 Orderak App</title>');
await writeOutput(path.join(outputDirectory, 'app.html'), appShell);

let publicPageCount = 0;
for (const page of catalog.pages) {
  for (const locale of catalog.locales) {
    await writeOutput(
      outputPathForPage(outputDirectory, page, locale),
      renderPublicDocument({ catalog, locale, page, stylesheetLinks, indexable }),
    );
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

await writeOutput(path.join(outputDirectory, 'sitemap.xml'), buildSitemap(catalog));
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
