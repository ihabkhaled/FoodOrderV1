import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const DIRECTORY = 'src/shared/i18n/locales';
const locales = readdirSync(DIRECTORY).filter((file) => file.endsWith('.json'));

const read = (file) => JSON.parse(readFileSync(`${DIRECTORY}/${file}`, 'utf8'));

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
];

test('no locale shows the user "bucket" in any form', () => {
  const offences = [];
  for (const file of locales) {
    for (const [key, value] of Object.entries(read(file))) {
      for (const { pattern, why } of BANNED) {
        if (pattern.test(String(value))) {
          offences.push(`${file}:${key} — ${why}`);
        }
      }
    }
  }
  assert.deepEqual(offences, [], offences.join('\n'));
});

test('every locale agrees on how many strings it defines', () => {
  // Parity is enforced elsewhere by key; this catches a locale that was
  // rewritten wholesale and silently lost entries.
  const counts = locales.map((file) => Object.keys(read(file)).length);
  assert.equal(new Set(counts).size, 1, `locale sizes differ: ${counts.join(', ')}`);
});
