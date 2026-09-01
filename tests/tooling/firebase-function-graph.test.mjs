import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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

/**
 * Deployed names read straight from entry.ts by a deliberately separate, dumber
 * parser than the one under test. Independence is the point: if both used the
 * same code, the assertion would only prove the code agrees with itself.
 *
 * This does not compile the functions. The coverage job installs root
 * dependencies only, so shelling out to `npm --prefix functions run build`
 * failed there while passing locally.
 */
const declaredDeployedNames = () => {
  const entry = readFileSync('functions/src/entry.ts', 'utf8');
  const names = new Set();

  for (const match of entry.matchAll(/export\s*\{([^}]*)\}\s*from/gsu)) {
    for (const binding of match[1].split(',')) {
      const parts = binding.trim().split(/\s+as\s+/u);
      const name = (parts.at(-1) ?? '').trim();
      if (name) names.add(name);
    }
  }

  for (const match of entry.matchAll(/export\s*\*\s*from\s*'\.\/([\w.-]+?)(?:\.js)?'/gu)) {
    const seen = new Set([match[1]]);
    const queue = [match[1]];
    while (queue.length > 0) {
      const moduleName = queue.pop();
      const file = `functions/src/${moduleName}.ts`;
      if (!existsSync(file)) continue;
      const source = readFileSync(file, 'utf8');
      for (const fn of source.matchAll(/^export const (\w+) = on[A-Z]/gmu)) {
        names.add(fn[1]);
      }
      for (const nested of source.matchAll(/export\s*\*\s*from\s*'\.\/([\w.-]+?)(?:\.js)?'/gu)) {
        if (!seen.has(nested[1])) {
          seen.add(nested[1]);
          queue.push(nested[1]);
        }
      }
    }
  }

  return [...names].sort();
};

test('the graph covers every function entry.ts declares', () => {
  // The load-bearing invariant. A deployed function missing from the graph is
  // never selected, so a changed function would silently keep running old code
  // in production - worse than a slow deploy.
  const declared = declaredDeployedNames();
  const covered = new Set(graph.dependencies.keys());
  const uncovered = declared.filter((name) => !covered.has(name));
  assert.deepEqual(uncovered, [], `uncovered deployed functions: ${uncovered.join(', ')}`);
  assert.ok(declared.length > 40, `expected the real function set, saw ${declared.length}`);
});

test('the graph matches the compiled entry module when it can be loaded', async () => {
  // Strongest form of the same check, and the reason it is conditional: the
  // compiled output is committed, so the file exists even in jobs that install
  // root dependencies only - but importing it pulls in firebase-functions from
  // functions/node_modules, which those jobs do not have. Existence was not
  // enough to guard on; loadability is.
  //
  // A load failure means "not available here" and is skipped. A name the graph
  // does not cover still fails, so the check never weakens where it can run.
  const compiled = 'functions/lib/functions/src/entry.js';
  if (!existsSync(compiled)) return;
  let entry;
  try {
    entry = await import(pathToFileURL(`${process.cwd()}/${compiled}`).href);
  } catch {
    return;
  }
  const deployed = Object.keys(entry).sort();
  const covered = new Set(graph.dependencies.keys());
  assert.deepEqual(
    deployed.filter((name) => !covered.has(name)),
    [],
    'the compiled entry exports a function the graph does not cover',
  );
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
