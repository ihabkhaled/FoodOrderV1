import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  ISOLATED_FUNCTION_FILES,
  exportedFunctionNames,
  filterVersionOnlyReleaseFiles,
  isVersionOnlyPackageMetadataChange,
  normalizeChangedFiles,
  planFirebaseChanges,
  selectPreviousProductionTag,
} from '../../scripts/firebase-change-plan.mjs';

test('normalizes changed files', () => {
  assert.deepEqual(
    normalizeChangedFiles(['src\\main.tsx', 'src/main.tsx', '', ' docs/a.md ']),
    ['docs/a.md', 'src/main.tsx'],
  );
});

test('skips Firebase for frontend-only changes', () => {
  const plan = planFirebaseChanges(['src/main.tsx', 'docs/ux/audit.md']);
  assert.equal(plan.deployFunctions, false);
  assert.equal(plan.deployRules, false);
  assert.deepEqual(plan.functionTargets, []);
  assert.equal(plan.reason, 'no-firebase-targets-changed');
});

test('selects the previous production build and ignores branch prereleases', () => {
  const tags = [
    'v1.9.1-dev.8-deadbee',
    'v1.9.0-dev.12-cafebad',
    'v1.8.1-2',
    'v1.8.1-3',
    'backup/pre-release',
  ];
  assert.equal(selectPreviousProductionTag(tags, 'v1.9.1-0'), 'v1.8.1-3');
  assert.equal(
    selectPreviousProductionTag([...tags, 'v1.9.1-0'], 'v1.9.1-1'),
    'v1.9.1-0',
  );
  assert.equal(selectPreviousProductionTag(tags, 'v1.9.1-dev.9-aabbccd'), null);
});

test('recognizes version-only package and lockfile changes', () => {
  const beforePackage = JSON.stringify({
    name: 'food-order-v1',
    version: '1.9.0',
    dependencies: { react: '19.2.8' },
  });
  const afterPackage = JSON.stringify({
    name: 'food-order-v1',
    version: '1.9.1',
    dependencies: { react: '19.2.8' },
  });
  assert.equal(
    isVersionOnlyPackageMetadataChange(
      'package.json',
      beforePackage,
      afterPackage,
    ),
    true,
  );

  const beforeLock = JSON.stringify({
    version: '1.9.0',
    packages: { '': { name: 'food-order-v1', version: '1.9.0' } },
  });
  const afterLock = JSON.stringify({
    version: '1.9.1',
    packages: { '': { name: 'food-order-v1', version: '1.9.1' } },
  });
  assert.equal(
    isVersionOnlyPackageMetadataChange(
      'functions/package-lock.json',
      beforeLock,
      afterLock,
    ),
    true,
  );

  assert.equal(
    isVersionOnlyPackageMetadataChange(
      'package.json',
      beforePackage,
      JSON.stringify({
        name: 'food-order-v1',
        version: '1.9.1',
        dependencies: { react: '20.0.0' },
      }),
    ),
    false,
  );
});

test('filters release metadata while preserving real package changes', () => {
  const snapshots = new Map([
    ['old:package.json', JSON.stringify({ name: 'app', version: '1.9.0' })],
    ['new:package.json', JSON.stringify({ name: 'app', version: '1.9.1' })],
    [
      'old:functions/package.json',
      JSON.stringify({ name: 'functions', version: '1.9.0', dependencies: { x: '1' } }),
    ],
    [
      'new:functions/package.json',
      JSON.stringify({ name: 'functions', version: '1.9.1', dependencies: { x: '2' } }),
    ],
  ]);
  const filtered = filterVersionOnlyReleaseFiles(
    ['src/main.tsx', 'package.json', 'functions/package.json'],
    'old',
    'new',
    (ref, file) => snapshots.get(`${ref}:${file}`),
  );
  assert.deepEqual(filtered, ['functions/package.json', 'src/main.tsx']);
});

test('release diffs with normal version files still skip Firebase for UI-only releases', () => {
  const snapshots = new Map();
  for (const file of [
    'package.json',
    'package-lock.json',
    'functions/package.json',
    'functions/package-lock.json',
  ]) {
    const isLock = file.endsWith('package-lock.json');
    snapshots.set(
      `old:${file}`,
      JSON.stringify(
        isLock
          ? { version: '1.9.0', packages: { '': { version: '1.9.0' } } }
          : { name: file, version: '1.9.0' },
      ),
    );
    snapshots.set(
      `new:${file}`,
      JSON.stringify(
        isLock
          ? { version: '1.9.1', packages: { '': { version: '1.9.1' } } }
          : { name: file, version: '1.9.1' },
      ),
    );
  }
  const files = filterVersionOnlyReleaseFiles(
    [
      'src/v1-9-1.css',
      'src/shared/i18n/locales/ar-Latn.json',
      'package.json',
      'package-lock.json',
      'functions/package.json',
      'functions/package-lock.json',
    ],
    'old',
    'new',
    (ref, file) => snapshots.get(`${ref}:${file}`),
  );
  const plan = planFirebaseChanges(files, 'release-diff');
  assert.equal(plan.deployFunctions, false);
  assert.equal(plan.deployRules, false);
  assert.deepEqual(plan.functionTargets, []);
});

test('release diffs still deploy changed Firebase targets', () => {
  const plan = planFirebaseChanges(
    ['src/main.tsx', 'functions/src/social.ts', 'firestore.rules'],
    'release-diff',
  );
  assert.equal(plan.deployFunctions, true);
  assert.equal(plan.deployRules, true);
  assert.ok(plan.functionTargets.includes('sendFriendRequest'));
});

test('deploys only rules for a rules-only change', () => {
  const plan = planFirebaseChanges(['firestore.rules']);
  assert.equal(plan.deployFunctions, false);
  assert.equal(plan.deployRules, true);
});

test('targets only isolated order-session exports', () => {
  const plan = planFirebaseChanges(['functions/src/orderSessionsV170.ts']);
  assert.equal(plan.deployFunctions, true);
  assert.equal(plan.deployRules, false);
  assert.deepEqual(plan.functionTargets, [
    'createOrderSessionV170',
    'getOrderSessionViewV170',
    'listOrderSessionsV170',
    'transitionOrderSessionV170',
    'updateSessionContributionV170',
    'updateSessionParticipantResponseV170',
  ]);
});

test('combines isolated social targets without redeploying unrelated functions', () => {
  const plan = planFirebaseChanges([
    'functions/src/social.ts',
    'functions/src/socialV150.ts',
  ]);
  assert.equal(plan.deployFunctions, true);
  assert.ok(plan.functionTargets.includes('sendFriendRequest'));
  assert.ok(plan.functionTargets.includes('updateFriendGroupV150'));
  assert.ok(!plan.functionTargets.includes('createOrderSessionV170'));
});

test('shared function source changes safely fall back to every function', () => {
  const plan = planFirebaseChanges(['functions/src/notificationCore.ts']);
  assert.equal(plan.deployFunctions, true);
  assert.equal(plan.functionTargets, null);
});

test('deploys both targets when firebase.json changes', () => {
  const plan = planFirebaseChanges(['firebase.json']);
  assert.equal(plan.deployFunctions, true);
  assert.equal(plan.deployRules, true);
  assert.equal(plan.functionTargets, null);
});

test('uses a full deployment when the diff is unavailable', () => {
  const plan = planFirebaseChanges([], 'unreliable-diff');
  assert.equal(plan.deployFunctions, true);
  assert.equal(plan.deployRules, true);
  assert.equal(plan.functionTargets, null);
});

test('a real root dependency change no longer redeploys every function', () => {
  // The regression behind the 35-minute quota-failing release: the root
  // manifest changes on nearly every release, but functions/src never imports
  // the root package, so it must not be a function trigger.
  const plan = planFirebaseChanges(
    ['package.json', 'package-lock.json', 'src/main.tsx'],
    'release-diff',
  );
  assert.equal(plan.deployFunctions, false);
  assert.equal(plan.deployRules, false);
});

test('group-order-engine changes deploy all functions', () => {
  // The engine is compiled into the functions bundle (functions/tsconfig.json
  // includes ../packages/group-order-engine/src), so it is shared code.
  const plan = planFirebaseChanges(['packages/group-order-engine/src/index.ts']);
  assert.equal(plan.deployFunctions, true);
  assert.equal(plan.functionTargets, null);
});

test('shared functions source falls back to a full deploy', () => {
  const plan = planFirebaseChanges(['functions/src/notifications.ts']);
  assert.equal(plan.deployFunctions, true);
  assert.equal(plan.functionTargets, null);
});

test('surgical targets are read from the file, not a hand-kept list', () => {
  // The hand-kept list had drifted: it placed inviteFriendToGroup in
  // socialV150.ts while social.ts exports it, so a surgical social.ts deploy
  // would have skipped a changed function.
  const social = exportedFunctionNames(readFileSync('functions/src/social.ts', 'utf8'));
  assert.ok(social.includes('inviteFriendToGroup'));
  const plan = planFirebaseChanges(['functions/src/social.ts']);
  assert.deepEqual(plan.functionTargets, social);
  for (const file of ISOLATED_FUNCTION_FILES) {
    assert.ok(
      exportedFunctionNames(readFileSync(file, 'utf8')).length > 0,
      `${file} yields no exported functions; surgical deploys would skip it`,
    );
  }
});
