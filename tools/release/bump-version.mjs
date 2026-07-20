#!/usr/bin/env node
/**
 * Bump the repository's stable source version and synchronize every derived
 * manifest, Android version, changelog entry, and release-notes file.
 *
 * This command intentionally does not commit, tag, push, or publish. Those
 * operations remain owned by the versioning skill and CI release workflows.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  readJsonFile,
  resolveNextVersion,
  synchronizeRepositoryVersion,
} from './versioning-core.mjs';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const [, , requestedVersion, ...summaryParts] = process.argv;

if (!requestedVersion) {
  console.error(
    'Usage: node tools/release/bump-version.mjs <patch|minor|major|X.Y.Z> [summary]',
  );
  process.exit(1);
}

const packagePath = join(rootDirectory, 'package.json');
const currentVersion = readJsonFile(packagePath).version;
const nextVersion = resolveNextVersion(currentVersion, requestedVersion);
if (nextVersion === currentVersion) {
  throw new Error('The requested version is already the repository version.');
}

const summary = summaryParts.join(' ').trim();
const result = synchronizeRepositoryVersion({
  rootDirectory,
  nextVersion,
  summary,
  date: process.env.BUMP_DATE,
});

console.log(
  JSON.stringify(
    {
      from: currentVersion,
      to: nextVersion,
      androidVersionCode: result.androidVersionCode,
      notes: result.notesPath.replace(`${rootDirectory}/`, ''),
      package: JSON.parse(readFileSync(packagePath, 'utf8')).version,
    },
    null,
    2,
  ),
);
