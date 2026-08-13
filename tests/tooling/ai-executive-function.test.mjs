import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { renderExecutiveFunctionArtifacts } from '../../scripts/knowledge/build-executive-function.mjs';

test('executive control budgets stay finite', async () => {
  const policy = JSON.parse(
    await readFile('knowledge/executive-function/runtime-policy.json', 'utf8'),
  );

  assert.equal(policy.thresholds.maxActiveWorkItems, 1);
  assert.equal(policy.thresholds.maxNestingDepth, 3);
  assert.equal(policy.thresholds.maxSameStrategyAttempts, 3);
  assert.equal(policy.thresholds.maxCriticRounds, 2);
  assert.equal(policy.thresholds.maxFullReplansWithoutNewEvidence, 2);
  assert.equal(policy.thresholds.maxAgentDelegationDepth, 2);
  assert.equal(policy.thresholds.stalledProgressCyclesBeforeReset, 4);
});

test('executive artifacts render deterministically', async () => {
  const artifacts = await renderExecutiveFunctionArtifacts();
  assert.equal(artifacts.size, 7);
  assert.ok(artifacts.has('.ai/executive-function/runtime.json'));
  assert.ok(artifacts.has('.ai/executive-function/runtime.toon'));
  assert.ok(artifacts.has('.ai/executive-function/runtime.sjon'));
});

test('state machine reaches completion through verification', async () => {
  const stateMachine = JSON.parse(
    await readFile('knowledge/executive-function/state-machine.json', 'utf8'),
  );
  assert.equal(stateMachine.initial, 'boot');
  assert.ok(
    stateMachine.transitions.some(
      ([from, to]) => from === 'verify' && to === 'progress-check',
    ),
  );
  assert.ok(
    stateMachine.transitions.some(
      ([from, to]) => from === 'progress-check' && to === 'complete',
    ),
  );
});
