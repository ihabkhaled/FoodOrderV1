#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const policyPath = 'knowledge/executive-function/runtime-policy.json';
const stateMachinePath = 'knowledge/executive-function/state-machine.json';
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

const readJson = async (file) =>
  JSON.parse(await readFile(path.join(root, file), 'utf8'));

export const renderExecutiveFunctionArtifacts = async () => {
  const policy = await readJson(policyPath);
  const stateMachine = await readJson(stateMachinePath);
  const thresholds = policy.thresholds;
  const compact = {
    v: policy.version,
    goal: 'lock',
    done: 'finite',
    scope: 'guard',
    evidence: 'required',
    wip: thresholds.maxActiveWorkItems,
    nest: thresholds.maxNestingDepth,
    retry: thresholds.maxSameStrategyAttempts,
    critic: thresholds.maxCriticRounds,
    replan: thresholds.maxFullReplansWithoutNewEvidence,
    delegate: thresholds.maxAgentDelegationDepth,
    stalled: thresholds.stalledProgressCyclesBeforeReset,
    classify: policy.issueClasses,
    verify: 'smallest-sufficient-proof',
    recover: 'return-to-objective',
    communicate: 'short-direct-concrete-visible',
    stop: 'when-done-is-proven',
  };

  const generatedFrom = [policyPath, stateMachinePath];
  const runtime = {
    generated: true,
    generatedFrom,
    policy,
  };
  const manifest = {
    generated: true,
    generatedFrom,
    rules: [
      'rules/22-executive-function-and-delivery.md',
      'rules/23-context-memory-and-evidence.md',
      'rules/24-communication-verification-and-completion.md',
    ],
    skills: [
      'skills/executive-function.md',
      'skills/bounded-investigation-and-scope-guard.md',
      'skills/attention-and-loop-recovery.md',
      'skills/context-compression-and-handoff.md',
      'skills/verification-controller.md',
      'skills/communicate-briefly.md',
    ],
    runtime: [
      '.ai/executive-function/runtime.json',
      '.ai/executive-function/runtime.toon',
      '.ai/executive-function/runtime.sjon',
      '.ai/executive-function/state-machine.json',
    ],
  };
  const toon = [
    '# GENERATED: scripts/knowledge/build-executive-function.mjs',
    `v=${compact.v} goal=${compact.goal} done=${compact.done} scope=${compact.scope}`,
    `wip=${compact.wip} nest=${compact.nest} retry=${compact.retry} critic=${compact.critic}`,
    `replan=${compact.replan} delegate=${compact.delegate} stalled=${compact.stalled}`,
    `classify=${compact.classify.join('|')}`,
    `evidence=${compact.evidence} verify=${compact.verify}`,
    `recover=${compact.recover} communicate=${compact.communicate}`,
    `stop=${compact.stop}`,
    '',
  ].join('\n');
  const quickRouter = `<!-- GENERATED: scripts/knowledge/build-executive-function.mjs; DO NOT EDIT -->
# Quick task router

1. Read \`AGENTS.md\` and \`.ai/BOOTSTRAP.md\`.
2. Lock objective, Definition of Done, scope, and one active work item.
3. Run \`npm run knowledge:context -- --task="<task>"\`.
4. Read only the returned rules, skills, source owners, and tests.
5. Follow \`rules/22-executive-function-and-delivery.md\`.
6. Verify with the smallest sufficient proof, expand to required gates, then stop.

Current feature ownership is derived from tracked \`src/modules/*\` by
\`scripts/knowledge/routing.mjs\`; do not maintain a duplicate static module map here.
`;
  const currentState = `<!-- GENERATED: scripts/knowledge/build-executive-function.mjs; DO NOT EDIT -->
# Current AI execution state

No durable task is active in generated knowledge.

For a new task, compile fresh context with:

\`npm run knowledge:context -- --task="<exact objective>"\`

Temporary task state must remain local/generated. Promote only stable architecture,
decisions, recurring failures, and enduring preferences to durable memory.
`;

  return new Map([
    ['.ai/executive-function/runtime.json', json(runtime)],
    ['.ai/executive-function/runtime.toon', toon],
    ['.ai/executive-function/runtime.sjon', json(compact)],
    ['.ai/executive-function/state-machine.json', json({ generated: true, generatedFrom, stateMachine })],
    ['.ai/manifests/executive-function.json', json(manifest)],
    ['.ai/QUICK_ROUTER.md', quickRouter],
    ['.ai/CURRENT_STATE.md', currentState],
  ]);
};

export const writeExecutiveFunctionArtifacts = async () => {
  const artifacts = await renderExecutiveFunctionArtifacts();
  for (const [file, content] of artifacts) {
    const target = path.join(root, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  }
  return artifacts.size;
};

export const validateExecutiveFunctionArtifacts = async () => {
  const artifacts = await renderExecutiveFunctionArtifacts();
  const stale = [];
  for (const [file, expected] of artifacts) {
    const target = path.join(root, file);
    if (!existsSync(target)) {
      stale.push(`${file} is missing`);
      continue;
    }
    const actual = await readFile(target, 'utf8');
    if (actual !== expected) stale.push(`${file} is stale`);
  }
  if (stale.length > 0) throw new Error(stale.join('\n'));
  return artifacts.size;
};

const direct =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const checking = process.argv.includes('--check');
  const count = checking
    ? await validateExecutiveFunctionArtifacts()
    : await writeExecutiveFunctionArtifacts();
  console.log(`Executive function artifacts ${checking ? 'validated' : 'generated'}: ${count}.`);
}
