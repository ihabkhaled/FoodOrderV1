import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeChangedFiles,
  planFirebaseChanges,
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

test('release diffs do not force Firebase for UI-only releases', () => {
  const plan = planFirebaseChanges(
    ['src/v1-9-1.css', 'src/shared/i18n/locales/ar-Latn.json'],
    'release-diff',
  );
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
