#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

const FULL_DEPLOY_REASONS = new Set([
  'manual-dispatch',
  'forced',
  'unreliable-diff',
]);

const FUNCTION_PATH_PREFIXES = ['functions/'];
const FUNCTION_PATHS = new Set(['package.json', 'package-lock.json']);
const RULE_PATHS = new Set(['firestore.rules', 'firestore.indexes.json']);
const VERSION_METADATA_PATHS = new Set([
  'package.json',
  'package-lock.json',
  'functions/package.json',
  'functions/package-lock.json',
]);
const PRODUCTION_TAG_PATTERN =
  /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(0|[1-9]\d*))?$/u;

// Files whose public Firebase exports are isolated enough to deploy surgically.
// Any other Functions source/config change intentionally falls back to all
// functions so shared-domain changes never leave production partially updated.
const ISOLATED_FUNCTION_TARGETS = new Map([
  [
    'functions/src/orderSessionsV170.ts',
    [
      'createOrderSessionV170',
      'getOrderSessionViewV170',
      'listOrderSessionsV170',
      'transitionOrderSessionV170',
      'updateSessionContributionV170',
      'updateSessionParticipantResponseV170',
    ],
  ],
  [
    'functions/src/social.ts',
    [
      'createFriendGroup',
      'getSocialOverview',
      'inviteFriendToBucketV151',
      'listBucketAccessGrants',
      'respondBucketInvitationV151',
      'respondFriendGroupInvitation',
      'respondFriendRequest',
      'searchSocialUserByEmail',
      'sendFriendRequest',
      'shareBucketWithFriend',
      'shareBucketWithFriendGroup',
    ],
  ],
  [
    'functions/src/socialV150.ts',
    [
      'deleteFriendGroupV150',
      'inviteFriendToGroup',
      'inviteFriendToGroupV150',
      'leaveFriendGroupV150',
      'removeFriendGroupMemberV150',
      'unfriendV150',
      'updateFriendGroupV150',
    ],
  ],
]);

export const normalizeChangedFiles = (files) =>
  [...new Set(files.map((file) => file.trim().replaceAll('\\', '/')).filter(Boolean))].sort();

const resolveFunctionTargets = (changedFiles) => {
  const functionFiles = changedFiles.filter(
    (file) =>
      FUNCTION_PATHS.has(file) ||
      FUNCTION_PATH_PREFIXES.some((prefix) => file.startsWith(prefix)),
  );
  if (functionFiles.length === 0) return [];

  const targets = new Set();
  for (const file of functionFiles) {
    const isolated = ISOLATED_FUNCTION_TARGETS.get(file);
    if (!isolated) return null;
    for (const target of isolated) targets.add(target);
  }
  return [...targets].sort();
};

export const planFirebaseChanges = (files, reason = 'changed-files') => {
  const changedFiles = normalizeChangedFiles(files);
  if (FULL_DEPLOY_REASONS.has(reason)) {
    return {
      changedFiles,
      deployFunctions: true,
      deployRules: true,
      functionTargets: null,
      reason,
    };
  }

  const firebaseConfigChanged = changedFiles.includes('firebase.json');
  const functionTargets = firebaseConfigChanged ? null : resolveFunctionTargets(changedFiles);
  const deployFunctions = firebaseConfigChanged || functionTargets === null || functionTargets.length > 0;
  const deployRules =
    firebaseConfigChanged || changedFiles.some((file) => RULE_PATHS.has(file));

  return {
    changedFiles,
    deployFunctions,
    deployRules,
    functionTargets: deployFunctions ? functionTargets : [],
    reason:
      deployFunctions || deployRules
        ? reason
        : changedFiles.length > 0
          ? 'no-firebase-targets-changed'
          : 'unreliable-diff',
  };
};

const parseProductionTag = (tag) => {
  const match = PRODUCTION_TAG_PATTERN.exec(String(tag).trim());
  if (!match) return null;
  return {
    tag: String(tag).trim(),
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    build: match[4] === undefined ? -1 : Number(match[4]),
  };
};

const compareProductionTags = (left, right) => {
  for (const key of ['major', 'minor', 'patch', 'build']) {
    if (left[key] !== right[key]) return left[key] > right[key] ? 1 : -1;
  }
  return 0;
};

export const selectPreviousProductionTag = (tags, currentTag) => {
  const current = parseProductionTag(currentTag);
  if (!current) return null;
  return (
    tags
      .map(parseProductionTag)
      .filter((candidate) => candidate && compareProductionTags(candidate, current) < 0)
      .toSorted((left, right) => compareProductionTags(right, left))[0]?.tag ?? null
  );
};

const normalizedVersionFile = (file, content) => {
  const parsed = JSON.parse(content);
  delete parsed.version;
  if (file.endsWith('package-lock.json') && parsed.packages?.['']) {
    delete parsed.packages[''].version;
  }
  return parsed;
};

export const isVersionOnlyPackageMetadataChange = (
  file,
  beforeContent,
  afterContent,
) => {
  if (!VERSION_METADATA_PATHS.has(file)) return false;
  try {
    return (
      JSON.stringify(normalizedVersionFile(file, beforeContent)) ===
      JSON.stringify(normalizedVersionFile(file, afterContent))
    );
  } catch {
    return false;
  }
};

export const filterVersionOnlyReleaseFiles = (
  files,
  beforeRef,
  afterRef,
  readAtRef,
) =>
  normalizeChangedFiles(files).filter((file) => {
    if (!VERSION_METADATA_PATHS.has(file)) return true;
    try {
      return !isVersionOnlyPackageMetadataChange(
        file,
        readAtRef(beforeRef, file),
        readAtRef(afterRef, file),
      );
    } catch {
      // Missing/unreadable files are real changes. Keep them so deployment
      // safely falls back instead of hiding a dependency or package mutation.
      return true;
    }
  });

const readEvent = () => {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) return {};
  try {
    return JSON.parse(readFileSync(eventPath, 'utf8'));
  } catch {
    return {};
  }
};

const git = (args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const gitFile = (ref, file) => git(['show', `${ref}:${file}`]);

const diffFiles = (before, after) => {
  try {
    return normalizeChangedFiles(git(['diff', '--name-only', before, after]).split('\n'));
  } catch {
    try {
      const ref = process.env.GITHUB_REF_NAME || 'main';
      execFileSync('git', ['fetch', '--no-tags', '--depth=2', 'origin', ref], {
        stdio: 'ignore',
      });
      return normalizeChangedFiles(git(['diff', '--name-only', before, after]).split('\n'));
    } catch {
      try {
        return normalizeChangedFiles(
          git(['diff', '--name-only', `${after}^1`, after]).split('\n'),
        );
      } catch {
        return [];
      }
    }
  }
};

const remoteProductionTags = () =>
  git(['ls-remote', '--tags', '--refs', 'origin'])
    .split('\n')
    .map((line) => line.match(/refs\/tags\/(.+)$/u)?.[1] ?? '')
    .filter(Boolean);

const fetchTag = (tag) => {
  execFileSync(
    'git',
    ['fetch', '--no-tags', '--depth=1', 'origin', `refs/tags/${tag}:refs/tags/${tag}`],
    { stdio: 'ignore' },
  );
};

const releaseTagDiffFiles = (after, currentTag) => {
  try {
    // Branch prerelease tags must never become the baseline for production.
    // Resolve the previous production build directly from remote tags, fetch
    // only that tag, then compare its complete tree with this release.
    const previousTag = selectPreviousProductionTag(
      remoteProductionTags(),
      currentTag,
    );
    if (previousTag) {
      fetchTag(previousTag);
      return filterVersionOnlyReleaseFiles(
        diffFiles(previousTag, after),
        previousTag,
        after,
        gitFile,
      );
    }
  } catch {
    // First release or unavailable remote tags. Fall through to the direct
    // parent; if that is also unavailable the caller safely chooses full deploy.
  }
  return filterVersionOnlyReleaseFiles(
    diffFiles(`${after}^1`, after),
    `${after}^1`,
    after,
    gitFile,
  );
};

export const resolveFirebaseChangePlan = () => {
  if (process.env.FORCE_FIREBASE_DEPLOY === '1') {
    return planFirebaseChanges([], 'forced');
  }

  const explicitFiles = process.env.FIREBASE_CHANGED_FILES;
  if (explicitFiles) {
    return planFirebaseChanges(explicitFiles.split(/[\n,]/u));
  }

  const eventName = process.env.GITHUB_EVENT_NAME ?? '';
  const ref = process.env.GITHUB_REF ?? '';
  if (eventName === 'workflow_dispatch') {
    return planFirebaseChanges([], 'manual-dispatch');
  }

  const event = readEvent();
  const after =
    typeof event.after === 'string'
      ? event.after
      : process.env.GITHUB_SHA || 'HEAD';

  if (ref.startsWith('refs/tags/')) {
    const currentTag =
      process.env.GITHUB_REF_NAME || ref.slice('refs/tags/'.length);
    const files = releaseTagDiffFiles(after, currentTag);
    return files.length > 0
      ? planFirebaseChanges(files, 'release-diff')
      : planFirebaseChanges([], 'no-firebase-targets-changed');
  }

  const before = typeof event.before === 'string' ? event.before : '';
  const invalidBefore = !before || /^0+$/u.test(before);
  if (eventName !== 'push' || invalidBefore) {
    return planFirebaseChanges([], 'unreliable-diff');
  }

  const files = filterVersionOnlyReleaseFiles(
    diffFiles(before, after),
    before,
    after,
    gitFile,
  );
  return files.length > 0
    ? planFirebaseChanges(files)
    : planFirebaseChanges([], 'no-firebase-targets-changed');
};

const invokedDirectly =
  process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll('\\', '/'));
if (invokedDirectly) {
  process.stdout.write(`${JSON.stringify(resolveFirebaseChangePlan(), null, 2)}\n`);
}
