import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import test from 'node:test';

/**
 * End-to-end tests assert the words a user actually reads, which is the right
 * thing for a user-interface test and the reason they break when copy changes.
 *
 * They broke three times in one release: 'Bucket title', then 'Bucket saved.',
 * then 'Bucket invitation sent...'. Each time CI found it several minutes after
 * a push, because nothing local compared test copy against the strings the
 * application actually ships. This does.
 */
const localeValues = () => {
  const values = new Set();
  const walk = (directory) => {
    for (const entry of readdirSync(directory)) {
      const path = `${directory}/${entry}`;
      if (statSync(path).isDirectory()) {
        if (entry !== 'node_modules') walk(path);
        continue;
      }
      if (!path.includes('/locales/') || !entry.endsWith('.json')) continue;
      const data = JSON.parse(readFileSync(path, 'utf8'));
      for (const value of Object.values(data)) {
        if (typeof value === 'string') values.add(value);
      }
    }
  };
  walk('src');
  return values;
};

/** Literals passed to the matchers that assert on visible text. */
const assertedCopy = () => {
  const found = [];
  for (const file of readdirSync('tests/e2e').filter((name) => name.endsWith('.ts'))) {
    const source = readFileSync(`tests/e2e/${file}`, 'utf8');
    const patterns = [
      /getByText\(\s*'([^'\n]+)'/gu,
      /toContainText\(\s*'([^'\n]+)'/gu,
      /getByLabel\(\s*'([^'\n]+)'/gu,
      /getByRole\([^)]*?name:\s*'([^'\n]+)'/gsu,
    ];
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        found.push({ file, text: match[1] });
      }
    }
  }
  return found;
};

/** Vocabulary the interface has retired. Rule 28 owns the list. */
const RETIRED = /bucket|freeze|frozen|\bContributor\b|\bViewer\b|\bRevoke\b/iu;

test('no end-to-end test asserts copy the app has retired', () => {
  // Deliberately narrow. Tests legitimately type their own data - "Friday
  // Lunch", "Bashandy" - so comparing every literal against the locale files
  // produces noise. What broke three times was asserted copy still using a
  // word the interface no longer says, and that is exactly what this catches.
  const values = localeValues();
  const drifted = assertedCopy().filter(
    ({ text }) => RETIRED.test(text) && !values.has(text),
  );

  assert.deepEqual(
    drifted.map(({ file, text }) => `${file}: ${text}`),
    [],
    'these tests assert wording the application no longer uses',
  );
});
