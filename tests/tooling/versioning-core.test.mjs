import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { synchronizeRepositoryVersion } from '../../tools/release/versioning-core.mjs';

const writeJson = (path, version) =>
  writeFileSync(
    path,
    `${JSON.stringify({ version, packages: { '': { version } } }, null, 2)}\n`,
  );

test('synchronizes web, functions, Android, and iOS versions idempotently', (context) => {
  const rootDirectory = mkdtempSync(join(tmpdir(), 'food-order-versioning-'));
  context.after(() => rmSync(rootDirectory, { recursive: true, force: true }));

  for (const directory of [
    'functions',
    'android/app',
    'ios/App/App.xcodeproj',
    'release-notes',
  ]) {
    mkdirSync(join(rootDirectory, directory), { recursive: true });
  }
  writeJson(join(rootDirectory, 'package.json'), '1.7.0');
  writeJson(join(rootDirectory, 'package-lock.json'), '1.7.0');
  writeJson(join(rootDirectory, 'functions/package.json'), '1.7.0');
  writeJson(join(rootDirectory, 'functions/package-lock.json'), '1.7.0');
  writeFileSync(
    join(rootDirectory, 'android/app/build.gradle'),
    'versionCode 9\nversionName "1.7.0"\n',
  );
  writeFileSync(
    join(rootDirectory, 'ios/App/App.xcodeproj/project.pbxproj'),
    [
      'CURRENT_PROJECT_VERSION = 5;',
      'MARKETING_VERSION = 1.7.0;',
      'CURRENT_PROJECT_VERSION = 5;',
      'MARKETING_VERSION = 1.7.0;',
    ].join('\n'),
  );
  writeFileSync(join(rootDirectory, 'CHANGELOG.md'), '# Changelog\n\n<!-- releases -->\n');

  const first = synchronizeRepositoryVersion({
    rootDirectory,
    nextVersion: '1.7.1',
    summary: 'Release test',
    date: '2026-07-22',
  });
  const second = synchronizeRepositoryVersion({
    rootDirectory,
    nextVersion: '1.7.1',
    summary: 'Release test',
    date: '2026-07-22',
  });

  assert.equal(first.androidVersionCode, 10);
  assert.equal(first.iosBuildNumber, 6);
  assert.equal(second.androidVersionCode, 10);
  assert.equal(second.iosBuildNumber, 6);
  assert.equal(
    JSON.parse(readFileSync(join(rootDirectory, 'package.json'), 'utf8')).version,
    '1.7.1',
  );
  assert.match(
    readFileSync(join(rootDirectory, 'android/app/build.gradle'), 'utf8'),
    /versionCode 10\s+versionName "1\.7\.1"/u,
  );
  const iosProject = readFileSync(
    join(rootDirectory, 'ios/App/App.xcodeproj/project.pbxproj'),
    'utf8',
  );
  assert.equal(
    [...iosProject.matchAll(/MARKETING_VERSION = 1\.7\.1;/gu)].length,
    2,
  );
  assert.equal(
    [...iosProject.matchAll(/CURRENT_PROJECT_VERSION = 6;/gu)].length,
    2,
  );
});
