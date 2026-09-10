import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import test from 'node:test';

/**
 * Every locale directory in the tree, not just the shared one.
 *
 * Modules carry their own translations. The first version of this test looked
 * only at src/shared/i18n/locales, so group-orders kept "Freeze bucket" and
 * social kept "Invite friend to bucket" through a release that was supposed to
 * have removed the word - and an end-to-end test failed on a string this guard
 * should have caught first. Discovering the directories removes the chance of
 * the list going stale again.
 */
const localeDirectories = () => {
  const found = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory)) {
      const path = `${directory}/${entry}`;
      if (!statSync(path).isDirectory()) continue;
      if (entry === 'node_modules') continue;
      if (entry === 'locales') found.push(path);
      else walk(path);
    }
  };
  walk('src');
  return found;
};

const DIRECTORIES = localeDirectories();

const localeFiles = (directory) =>
  readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .map((file) => ({ file: `${directory}/${file}`, data: JSON.parse(readFileSync(`${directory}/${file}`, 'utf8')) }));

/**
 * Words the interface must never show a user again.
 *
 * "Bucket" is not a word for a list of food. Six locales had shipped a
 * transliteration of the English jargon rather than a translation - bakketto,
 * बकेट, บัคเก็ต - and French called it a shopping basket, so the term meant
 * nothing in most of the languages the app supports.
 */
const BANNED = [
  { pattern: /\bbuckets?\b/iu, why: 'say menu (or the locale word for it)' },
  { pattern: /बकेट/u, why: 'transliterated "bucket"; say मेन्यू' },
  { pattern: /バケット/u, why: 'transliterated "bucket"; say メニュー' },
  { pattern: /บัคเก็ต/u, why: 'transliterated "bucket"; say เมนู' },
  { pattern: /\bpaniers?\b/iu, why: 'a basket is not a menu; say menu' },
  { pattern: /\bfreeze\b/iu, why: 'say what happens: stop taking orders' },
];

test('no locale in any module shows the user "bucket" or "freeze"', () => {
  const offences = [];
  for (const directory of DIRECTORIES) {
    for (const { file, data } of localeFiles(directory)) {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value !== 'string') continue;
        for (const { pattern, why } of BANNED) {
          if (pattern.test(value)) offences.push(`${file}:${key} — ${why}`);
        }
      }
    }
  }
  assert.deepEqual(offences, [], offences.join(', '));
});

test('every locale directory found at least one file', () => {
  assert.ok(DIRECTORIES.length >= 6, `only found ${DIRECTORIES.length} locale directories`);
  for (const directory of DIRECTORIES) {
    assert.ok(localeFiles(directory).length > 0, `${directory} has no locale files`);
  }
});

test('within a directory every locale defines the same number of strings', () => {
  for (const directory of DIRECTORIES) {
    const counts = localeFiles(directory).map(({ data }) => Object.keys(data).length);
    assert.equal(
      new Set(counts).size,
      1,
      `${directory} locale sizes differ: ${counts.join(', ')}`,
    );
  }
});
