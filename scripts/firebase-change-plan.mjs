#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

const FULL_DEPLOY_REASONS = new Set([
  'manual-dispatch',
  'release-tag',
  'forced',
  'unreliable-diff',
]);

const FUNCTION_PATH_PREFIXES = ['functions/'];
const FUNCTION_PATHS = new Set(['package.json', 'package-lock.json']);
const RULE_PATHS = new Set(['firestore.rules', 'firestore.indexes.json']);

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
  if (ref.startsWith('refs/tags/')) {
    return planFirebaseChanges([], 'release-tag');
  }

  const event = readEvent();
  const before = typeof event.before === 'string' ? event.before : '';
  const after =
    typeof event.after === 'string'
      ? event.after
      : process.env.GITHUB_SHA || 'HEAD';
  const invalidBefore = !before || /^0+$/u.test(before);
  if (eventName !== 'push' || invalidBefore) {
    return planFirebaseChanges([], 'unreliable-diff');
  }

  const files = diffFiles(before, after);
  return files.length > 0
    ? planFirebaseChanges(files)
    : planFirebaseChanges([], 'unreliable-diff');
};

const invokedDirectly =
  process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll('\\', '/'));
if (invokedDirectly) {
  process.stdout.write(`${JSON.stringify(resolveFirebaseChangePlan(), null, 2)}\n`);
}
