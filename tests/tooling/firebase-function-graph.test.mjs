import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import {
  buildFunctionDependencyGraph,
  deployedFunctionSources,
  directImports,
  exportedFunctionNames,
  readSourceModules,
  resolveFunctionTargetsFromGraph,
  transitiveImports,
} from '../../scripts/firebase-function-graph.mjs';

const modules = readSourceModules();
const graph = buildFunctionDependencyGraph();

test('the graph covers every function entry.ts actually deploys', async () => {
  // The load-bearing invariant. A deployed function missing from the graph is
  // never selected, so a changed function would silently keep running old code
  // in production - worse than a slow deploy.
  execFileSync('npm', ['--prefix', 'functions', 'run', 'build'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  const entry = await import(
    pathToFileURL(`${process.cwd()}/functions/lib/functions/src/entry.js`).href
  );
  const deployed = Object.keys(entry).sort();
  const covered = new Set(graph.dependencies.keys());
  const uncovered = deployed.filter((name) => !covered.has(name));
  assert.deepEqual(uncovered, [], `uncovered deployed functions: ${uncovered.join(', ')}`);
  assert.ok(deployed.length > 40, `expected the real function set, saw ${deployed.length}`);
});

test('an aliased re-export is mapped under its deployed name', () => {
  // entry.ts deploys `inviteFriendToGroup`, a name that appears nowhere in
  // socialV150.ts. Reading source modules alone would miss it.
  assert.ok(graph.dependencies.has('inviteFriendToGroup'));
  assert.ok(
    graph.dependencies.get('inviteFriendToGroup').has('functions/src/socialV150.ts'),
  );
});

test('a shared helper selects only its dependents, not everything', () => {
  const targets = resolveFunctionTargetsFromGraph(['functions/src/notificationCore.ts']);
  assert.notEqual(targets, null);
  assert.ok(targets.length > 0);
  assert.ok(
    targets.length < graph.dependencies.size,
    'notificationCore is not imported by every module, so it must not select all',
  );
});

test('a leaf module selects only its own functions', () => {
  const targets = resolveFunctionTargetsFromGraph(['functions/src/inviteLinks.ts']);
  assert.deepEqual(targets, [
    'createInviteLinkV1100',
    'listInviteLinksV1100',
    'previewInviteLinkV1100',
    'redeemInviteLinkV1100',
    'revokeInviteLinkV1100',
  ]);
});

test('a side-effect import shared by every function forces a full deploy', () => {
  // globalOptions.ts sets region, cpu and maxInstances for all of them.
  assert.equal(resolveFunctionTargetsFromGraph(['functions/src/globalOptions.ts']), null);
  assert.equal(resolveFunctionTargetsFromGraph(['functions/src/entry.ts']), null);
});

test('a functions file outside the graph falls back rather than guessing', () => {
  for (const file of [
    'functions/package.json',
    'functions/tsconfig.json',
    'packages/group-order-engine/src/index.ts',
  ]) {
    assert.equal(resolveFunctionTargetsFromGraph([file]), null, file);
  }
});

test('no changed function files means nothing to deploy', () => {
  assert.deepEqual(resolveFunctionTargetsFromGraph([]), []);
});

test('transitive imports close over shared helpers', () => {
  const closure = transitiveImports('social', modules);
  assert.ok(closure.has('social'));
  assert.ok(closure.has('notificationCore'));
  assert.ok(closure.has('socialDomain'));
});

test('direct imports read both binding and side-effect forms', () => {
  const found = directImports("import './a.js';\nimport { x } from './b.js';\nexport * from './c.js';");
  assert.deepEqual([...found].sort(), ['a', 'b', 'c']);
});

test('only v2 function exports count as deployable names', () => {
  const names = exportedFunctionNames(
    'export const helper = () => 1;\nexport const doThing = onCall({}, async () => 1);\n',
  );
  assert.deepEqual(names, ['doThing']);
});

test('every mapped function depends on the module that defines it', () => {
  const sources = deployedFunctionSources(modules);
  for (const [name, moduleName] of sources) {
    assert.ok(
      graph.dependencies.get(name)?.has(`functions/src/${moduleName}.ts`),
      `${name} should depend on ${moduleName}`,
    );
  }
});
