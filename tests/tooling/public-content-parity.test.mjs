import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { loadPublicCatalog } from '../../scripts/public-content/public-content-build.shared.mjs';

test('static public content matches the runtime English homepage source', async () => {
  const root = process.cwd();
  const expected = JSON.parse(
    await readFile(
      path.join(
        root,
        'src',
        'modules',
        'public-content',
        'content',
        'english-home-copy.json',
      ),
      'utf8',
    ),
  );
  const catalog = await loadPublicCatalog(root);
  const homePage = catalog.pages.find((page) => page.id === 'home');

  assert.ok(homePage);
  assert.deepEqual(homePage.copy.en, expected);
  assert.equal(catalog.ui.en.brandName, catalog.site.brandName);
});
