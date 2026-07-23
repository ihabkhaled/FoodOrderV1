#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  compareStableVersions,
  readJsonFile,
  STABLE_SEMVER_PATTERN,
  synchronizeRepositoryVersion,
} from './versioning-core.mjs';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const mode = process.argv.includes('--check') ? 'check' : 'apply';

const runGit = (arguments_) =>
  execFileSync('git', arguments_, {
    cwd: rootDirectory,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const resolveCurrentBranch = () =>
  process.env.GITHUB_HEAD_REF ||
  process.env.GITHUB_REF_NAME ||
  runGit(['branch', '--show-current']);

const resolveTargetVersion = (branchName) => {
  const match = /^(?:release\/|version\/)?(\d+\.\d+\.\d+)(?:\/.*)?$/u.exec(
    branchName,
  );
  if (!match || !STABLE_SEMVER_PATTERN.test(match[1])) return null;
  return match[1];
};

const readAndroidVersion = () => {
  const gradle = readFileSync(
    join(rootDirectory, 'android', 'app', 'build.gradle'),
    'utf8',
  );
  return /versionName\s+"([^"]+)"/u.exec(gradle)?.[1] ?? null;
};

const readIosVersion = () => {
  const project = readFileSync(
    join(rootDirectory, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj'),
    'utf8',
  );
  return /MARKETING_VERSION = ([^;]+);/u.exec(project)?.[1] ?? null;
};

const collectMismatches = (targetVersion) => {
  const rootVersion = readJsonFile(join(rootDirectory, 'package.json')).version;
  const functionsVersion = readJsonFile(
    join(rootDirectory, 'functions', 'package.json'),
  ).version;
  const androidVersion = readAndroidVersion();
  const iosVersion = readIosVersion();
  const mismatches = [];

  if (rootVersion !== targetVersion) {
    mismatches.push(`package.json=${rootVersion}`);
  }
  if (functionsVersion !== targetVersion) {
    mismatches.push(`functions/package.json=${functionsVersion}`);
  }
  if (androidVersion !== targetVersion) {
    mismatches.push(`android versionName=${androidVersion}`);
  }
  if (iosVersion !== targetVersion) {
    mismatches.push(`iOS MARKETING_VERSION=${iosVersion}`);
  }

  return { mismatches, rootVersion };
};

const branchName = resolveCurrentBranch();
const targetVersion = resolveTargetVersion(branchName);
if (!targetVersion) {
  console.log(`Branch ${branchName || '(detached)'} has no target-version prefix.`);
  process.exit(0);
}

const { mismatches, rootVersion } = collectMismatches(targetVersion);
if (compareStableVersions(rootVersion, targetVersion) > 0) {
  throw new Error(
    `Branch ${branchName} targets ${targetVersion}, but the repository is already ${rootVersion}.`,
  );
}

if (mode === 'check') {
  if (mismatches.length > 0) {
    throw new Error(
      `Branch ${branchName} must be synchronized to ${targetVersion}: ${mismatches.join(', ')}`,
    );
  }
  console.log(`Branch ${branchName} is synchronized to ${targetVersion}.`);
  process.exit(0);
}

if (mismatches.length === 0) {
  console.log(`Branch ${branchName} is already synchronized to ${targetVersion}.`);
  process.exit(0);
}

const dirtyFiles = runGit(['status', '--porcelain']);
if (dirtyFiles) {
  throw new Error(
    `Cannot synchronize ${branchName} while the working tree is dirty. Commit or stash changes first.`,
  );
}

const result = synchronizeRepositoryVersion({
  rootDirectory,
  nextVersion: targetVersion,
  summary: `Start v${targetVersion} development`,
});

console.log(
  JSON.stringify(
    {
      branch: branchName,
      from: rootVersion,
      to: targetVersion,
      androidVersionCode: result.androidVersionCode,
      iosBuildNumber: result.iosBuildNumber,
      action: 'Commit the synchronized release files before implementation.',
    },
    null,
    2,
  ),
);
