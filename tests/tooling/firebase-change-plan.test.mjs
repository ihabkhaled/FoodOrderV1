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
  assert.equal(plan.reason, 'no-firebase-targets-changed');
});

test('deploys only rules for a rules-only change', () => {
  const plan = planFirebaseChanges(['firestore.rules']);
  assert.equal(plan.deployFunctions, false);
  assert.equal(plan.deployRules, true);
});

test('deploys only functions for function source changes', () => {
  const plan = planFirebaseChanges(['functions/src/index.ts']);
  assert.equal(plan.deployFunctions, true);
  assert.equal(plan.deployRules, false);
});

test('deploys both targets when firebase.json changes', () => {
  const plan = planFirebaseChanges(['firebase.json']);
  assert.equal(plan.deployFunctions, true);
  assert.equal(plan.deployRules, true);
});

test('uses a full deployment when the diff is unavailable', () => {
  const plan = planFirebaseChanges([], 'unreliable-diff');
  assert.equal(plan.deployFunctions, true);
  assert.equal(plan.deployRules, true);
});
