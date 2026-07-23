#!/usr/bin/env node

/**
 * Deterministic translation gate. Mirrors the runtime rules in
 * src/shared/i18n/message-catalog-validation.helper.ts for every locale
 * catalog directory, and structurally validates public-content locale files.
 *
 * Usage:
 *   node scripts/i18n/check-translations.mjs            # check everything
 *   node scripts/i18n/check-translations.mjs --locale=it # one locale only
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SUPPORTED_LOCALES = [
  'en',
  'ar',
  'it',
  'fa',
  'fr',
  'de',
  'es',
  'pt-BR',
  'hi',
  'th',
  'zh-CN',
  'ja',
];
const REFERENCE_LOCALE = 'en';
const UNTRANSLATED_VALUE_RATIO = 0.8;
const MINIMUM_UNTRANSLATED_CHECK_KEYS = 5;

const localeFilter = process.argv
  .find((argument) => argument.startsWith('--locale='))
  ?.slice('--locale='.length);

const failures = [];
const fail = (message) => failures.push(message);

const readJson = (filePath) => {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`${path.relative(ROOT, filePath)}: invalid JSON (${error.message})`);
    return null;
  }
};

const interpolationTokens = (message) =>
  [...message.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1]).sort();

const sameTokens = (left, right) =>
  left.length === right.length &&
  left.every((token, index) => token === right[index]);

const findCatalogDirectories = (directory, found = []) => {
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    if (!statSync(fullPath).isDirectory()) continue;
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    if (
      entry === 'locales' &&
      existsSync(path.join(fullPath, 'en.json')) &&
      !fullPath.includes(path.join('public-content', 'content'))
    ) {
      found.push(fullPath);
      continue;
    }
    findCatalogDirectories(fullPath, found);
  }
  return found;
};

const checkCatalogDirectory = (directory) => {
  const relative = path.relative(ROOT, directory);
  const reference = readJson(path.join(directory, `${REFERENCE_LOCALE}.json`));
  if (!reference) return;
  const referenceKeys = Object.keys(reference);

  for (const locale of SUPPORTED_LOCALES) {
    if (localeFilter && locale !== localeFilter) continue;
    const filePath = path.join(directory, `${locale}.json`);
    if (!existsSync(filePath)) {
      fail(`${relative}: missing locale file ${locale}.json`);
      continue;
    }
    const catalog = readJson(filePath);
    if (!catalog) continue;

    let identicalCount = 0;
    for (const key of referenceKeys) {
      if (!Object.hasOwn(catalog, key)) {
        fail(`${relative}/${locale}.json: missing key "${key}"`);
        continue;
      }
      const value = catalog[key];
      if (typeof value !== 'string') {
        fail(`${relative}/${locale}.json: key "${key}" must be a string`);
        continue;
      }
      if (value.trim().length === 0) {
        fail(`${relative}/${locale}.json: key "${key}" is blank`);
        continue;
      }
      if (locale === REFERENCE_LOCALE) continue;
      if (value === reference[key]) identicalCount += 1;
      const expected = interpolationTokens(reference[key]);
      const received = interpolationTokens(value);
      if (!sameTokens(expected, received)) {
        fail(
          `${relative}/${locale}.json: key "${key}" interpolation differs ` +
            `(expected ${JSON.stringify(expected)}, received ${JSON.stringify(received)})`,
        );
      }
    }
    for (const key of Object.keys(catalog)) {
      if (!Object.hasOwn(reference, key)) {
        fail(`${relative}/${locale}.json: unknown key "${key}"`);
      }
    }
    if (
      locale !== REFERENCE_LOCALE &&
      referenceKeys.length >= MINIMUM_UNTRANSLATED_CHECK_KEYS &&
      identicalCount / referenceKeys.length >= UNTRANSLATED_VALUE_RATIO
    ) {
      const percentage = Math.round((identicalCount / referenceKeys.length) * 100);
      fail(
        `${relative}/${locale}.json: appears untranslated ` +
          `(${identicalCount}/${referenceKeys.length} values, ${percentage}%, match en)`,
      );
    }
  }
};

const PUBLIC_PAGE_COPY_TEXT_FIELDS = [
  'navigationLabel',
  'seoTitle',
  'description',
  'eyebrow',
  'heading',
  'introduction',
];
const PUBLIC_SYSTEM_FIELDS = ['seoTitle', 'description', 'heading', 'body'];

const checkPublicPageStructure = (relative, pageId, copy, referenceCopy) => {
  for (const field of PUBLIC_PAGE_COPY_TEXT_FIELDS) {
    const value = copy[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      fail(`${relative}: pages.${pageId}.${field} is missing or blank`);
    }
  }
  const referenceSections = referenceCopy.sections ?? [];
  const sections = Array.isArray(copy.sections) ? copy.sections : null;
  if (!sections || sections.length !== referenceSections.length) {
    fail(
      `${relative}: pages.${pageId}.sections must have ` +
        `${referenceSections.length} entr${referenceSections.length === 1 ? 'y' : 'ies'} (matching en)`,
    );
  } else {
    sections.forEach((section, index) => {
      if (!section.heading?.trim()) {
        fail(`${relative}: pages.${pageId}.sections[${index}].heading is blank`);
      }
      if (!Array.isArray(section.paragraphs) || section.paragraphs.length === 0) {
        fail(`${relative}: pages.${pageId}.sections[${index}].paragraphs is empty`);
      }
    });
  }
  const referenceFaq = referenceCopy.faq ?? [];
  if (referenceFaq.length > 0) {
    const faq = Array.isArray(copy.faq) ? copy.faq : null;
    if (!faq || faq.length !== referenceFaq.length) {
      fail(
        `${relative}: pages.${pageId}.faq must have ${referenceFaq.length} entries (matching en)`,
      );
    } else {
      faq.forEach((item, index) => {
        if (!item.question?.trim() || !item.answer?.trim()) {
          fail(`${relative}: pages.${pageId}.faq[${index}] has a blank question/answer`);
        }
      });
    }
  }
};

const checkPublicContent = () => {
  const contentDirectory = path.join(
    ROOT,
    'src',
    'modules',
    'public-content',
    'content',
  );
  const base = readJson(path.join(contentDirectory, 'public-content.catalog.json'));
  if (!base) return;
  const pageIds = base.pages.map((page) => page.id);
  const uiFields = Object.keys(base.ui[REFERENCE_LOCALE]);
  const systemIds = Object.keys(base.systemPages);
  const embeddedLocales = new Set(['en', 'ar']);

  for (const locale of SUPPORTED_LOCALES) {
    if (localeFilter && locale !== localeFilter) continue;
    if (embeddedLocales.has(locale)) continue;
    const filePath = path.join(contentDirectory, 'locales', `${locale}.json`);
    const relative = path.relative(ROOT, filePath);
    if (!existsSync(filePath)) {
      fail(`${relative}: missing public content locale file`);
      continue;
    }
    const localized = readJson(filePath);
    if (!localized) continue;
    if (localized.locale !== locale) {
      fail(`${relative}: locale field must be "${locale}"`);
    }
    for (const field of uiFields) {
      const value = localized.ui?.[field];
      if (typeof value !== 'string' || value.trim().length === 0) {
        fail(`${relative}: ui.${field} is missing or blank`);
      }
    }
    for (const pageId of pageIds) {
      const copy = localized.pages?.[pageId];
      if (!copy) {
        fail(`${relative}: pages.${pageId} is missing`);
        continue;
      }
      const referenceCopy = base.pages.find((page) => page.id === pageId).copy[
        REFERENCE_LOCALE
      ];
      checkPublicPageStructure(relative, pageId, copy, referenceCopy);
    }
    for (const systemId of systemIds) {
      const copy = localized.systemPages?.[systemId];
      if (!copy) {
        fail(`${relative}: systemPages.${systemId} is missing`);
        continue;
      }
      for (const field of PUBLIC_SYSTEM_FIELDS) {
        const value = copy[field];
        if (typeof value !== 'string' || value.trim().length === 0) {
          fail(`${relative}: systemPages.${systemId}.${field} is missing or blank`);
        }
      }
    }
  }
};

const catalogDirectories = findCatalogDirectories(path.join(ROOT, 'src')).sort();
for (const directory of catalogDirectories) checkCatalogDirectory(directory);
checkPublicContent();

if (failures.length > 0) {
  console.error(`Translation check failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Translation check passed for ${catalogDirectories.length} catalog ` +
    `director${catalogDirectories.length === 1 ? 'y' : 'ies'} and public content` +
    `${localeFilter ? ` (locale ${localeFilter})` : ''}.`,
);
