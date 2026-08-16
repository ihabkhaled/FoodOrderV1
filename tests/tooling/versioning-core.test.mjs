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

import {
  isReleaseBranchVersionCompatible,
  isSameVersionMaintenanceBranch,
  synchronizeRepositoryVersion,
} from '../../tools/release/versioning-core.mjs';

const writeJson = (path, version) =>
  writeFileSync(
    path,
    `${JSON.stringify({ version, packages: { '': { version } } }, null, 2)}\n`,
  );

test('classifies same-version maintenance branches without admitting features', () => {
  for (const branch of [
    'fix/adsense-loader',
    'hotfix/firebase-capacity',
    'dependabot/npm_and_yarn/firebase-12.17.0',
    'dependabot/github_actions/actions/setup-node-7',
  ]) {
    assert.equal(isSameVersionMaintenanceBranch(branch), true, branch);
  }

  for (const branch of [
    'feature/dependency-dashboard',
    'release/1.9.0/dependencies',
    'dependabot',
    'feature/dependabot/npm-update',
    '',
  ]) {
    assert.equal(isSameVersionMaintenanceBranch(branch), false, branch);
  }
});

test('release branches accept only their current or newer patch versions', () => {
  for (const repositoryVersion of ['1.9.0', '1.9.1', '1.9.9']) {
    assert.equal(
      isReleaseBranchVersionCompatible('1.9.0', repositoryVersion),
      true,
      repositoryVersion,
    );
  }

  for (const repositoryVersion of ['1.9.0', '1.8.9', '1.10.0', '2.0.0']) {
    assert.equal(
      isReleaseBranchVersionCompatible('1.9.1', repositoryVersion),
      false,
      repositoryVersion,
    );
  }

  assert.throws(() =>
    isReleaseBranchVersionCompatible('1.9', '1.9.1'),
  );
});

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

test('build numbers count builds of one version and reset when it changes', async () => {
  const { resolveNextBuildNumber } = await import(
    '../../tools/release/versioning-core.mjs'
  );
  const tags = [
    'v1.8.0-dev.253-89c779f',
    'v1.8.0-dev.249-50d45e1',
    'v1.8.0-4',
    'v1.7.4-434',
    'v1.7.4-dev.227-8a595e1',
  ];

  assert.equal(
    resolveNextBuildNumber({ baseVersion: '1.8.0', channel: 'dev', tags }),
    254,
  );
  assert.equal(
    resolveNextBuildNumber({ baseVersion: '1.8.0', channel: 'main', tags }),
    5,
  );

  // The point of the change: a version nobody has built starts at zero, so
  // bumping the version resets the counter with nothing to remember.
  assert.equal(
    resolveNextBuildNumber({ baseVersion: '1.9.0', channel: 'dev', tags }),
    0,
  );
  assert.equal(
    resolveNextBuildNumber({ baseVersion: '1.9.0', channel: 'main', tags }),
    0,
  );

  // A dev tag must never be mistaken for a release tag of the same version.
  assert.equal(
    resolveNextBuildNumber({
      baseVersion: '1.7.4',
      channel: 'main',
      tags: ['v1.7.4-dev.9-abc1234'],
    }),
    0,
  );

  // Neighbouring versions must not bleed into each other.
  assert.equal(
    resolveNextBuildNumber({
      baseVersion: '1.8.0',
      channel: 'main',
      tags: ['v1.8.01-7', 'v11.8.0-9'],
    }),
    0,
  );

  assert.throws(() =>
    resolveNextBuildNumber({ baseVersion: '1.8', channel: 'main', tags: [] }),
  );
  assert.throws(() =>
    resolveNextBuildNumber({ baseVersion: '1.8.0', channel: 'beta', tags: [] }),
  );
});
