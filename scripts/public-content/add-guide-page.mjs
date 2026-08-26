#!/usr/bin/env node
/**
 * Registers a public guide page everywhere a page must be declared.
 *
 * A public page is declared in four places: the content catalogue, the twelve
 * locale files, the runtime route registry, and the Vercel bare-path redirect
 * list. Declaring it in three of them produces a page that half exists — it
 * builds, but a bare link 404s or the runtime router cannot resolve it. This
 * does all four from one definition so they cannot drift.
 *
 * Usage: node scripts/public-content/add-guide-page.mjs <definition.mjs>
 * where the module default-exports { id, slug, navigation, adEligible, copy,
 * locales }. `copy` carries en and ar; `locales` carries the other eleven.
 *
 * The route id union in public-content.types.ts is deliberately NOT edited
 * here: it is type-level policy, and TypeScript should fail loudly until a
 * person adds the id on purpose.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const CATALOG = 'src/modules/public-content/content/public-content.catalog.json';
const REGISTRY = 'src/modules/public-content/routes/public-content-route-registry.helper.ts';
const VERCEL = 'vercel.json';
const LOCALE_DIRECTORY = 'src/modules/public-content/content/locales';
const CATALOG_LOCALES = ['en', 'ar'];

const readText = (file) => readFileSync(file, 'utf8');
const endOfLine = (text) => (text.includes('\r\n') ? '\r\n' : '\n');
const writeJson = (file, data, eol) =>
  writeFileSync(file, JSON.stringify(data, null, 2).split('\n').join(eol) + eol);

const assertShape = (definition) => {
  for (const field of ['id', 'slug', 'copy', 'locales']) {
    if (!definition[field]) throw new Error(`Guide definition is missing ${field}.`);
  }
  for (const locale of CATALOG_LOCALES) {
    if (!definition.copy[locale]) {
      throw new Error(`Guide copy is missing the ${locale} catalogue locale.`);
    }
  }
  // Section and FAQ counts must match English exactly; the content validator
  // enforces parity and a mismatch fails the build rather than shipping a
  // locale that quietly says less.
  const english = definition.copy.en;
  const everyLocale = { ...definition.copy, ...definition.locales };
  for (const [locale, copy] of Object.entries(everyLocale)) {
    if (copy.sections?.length !== english.sections.length) {
      throw new Error(`Section parity: ${locale} has ${copy.sections?.length} of ${english.sections.length}.`);
    }
    if ((copy.faq?.length ?? 0) !== (english.faq?.length ?? 0)) {
      throw new Error(`FAQ parity: ${locale}.`);
    }
  }
};

export const addGuidePage = (definition) => {
  assertShape(definition);
  const { id, slug, navigation = false, adEligible = true, copy, locales } = definition;

  const catalogRaw = readText(CATALOG);
  const catalog = JSON.parse(catalogRaw);
  if (catalog.pages.some((page) => page.id === id)) {
    throw new Error(`Page already present in the catalogue: ${id}`);
  }
  // Guides sit before the legal pages so the sitemap and footer keep a
  // sensible reading order.
  const legalIndex = catalog.pages.findIndex((page) => page.id === 'privacy');
  catalog.pages.splice(legalIndex, 0, { id, slug, navigation, adEligible, copy });
  writeJson(CATALOG, catalog, endOfLine(catalogRaw));

  for (const [locale, pageCopy] of Object.entries(locales)) {
    const file = path.join(LOCALE_DIRECTORY, `${locale}.json`);
    const raw = readText(file);
    const data = JSON.parse(raw);
    data.pages[id] = pageCopy;
    writeJson(file, data, endOfLine(raw));
  }

  const registryRaw = readText(REGISTRY);
  const anchor = "  { id: 'privacy',";
  if (!registryRaw.includes(anchor)) throw new Error('Route registry anchor not found.');
  const eol = endOfLine(registryRaw);
  const line = `  { id: '${id}', slug: '${slug}', navigation: ${navigation}, adEligible: ${adEligible} },${eol}`;
  writeFileSync(REGISTRY, registryRaw.replace(anchor, `${line}${anchor}`));

  const vercelRaw = readText(VERCEL);
  const marker = '(about|how-it-works|features';
  if (!vercelRaw.includes(marker)) throw new Error('Vercel redirect list not found.');
  if (!vercelRaw.includes(`|${slug}|`) && !vercelRaw.includes(`|${slug})`)) {
    writeFileSync(VERCEL, vercelRaw.replace(marker, `${marker}|${slug}`));
  }

  return { id, locales: Object.keys(locales).length + CATALOG_LOCALES.length };
};

const [definitionPath] = process.argv.slice(2);
if (definitionPath) {
  const module = await import(pathToFileURL(path.resolve(definitionPath)).href);
  const result = addGuidePage(module.default ?? module.guide);
  process.stdout.write(
    `Registered ${result.id} in ${result.locales} locales.\n` +
      `Add '${result.id}' to PublicRouteId in public-content.types.ts, then run npm run build:web.\n`,
  );
}
