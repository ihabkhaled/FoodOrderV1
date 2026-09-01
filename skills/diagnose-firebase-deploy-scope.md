# Skill: diagnose and tune Firebase deploy scope and CPU quota

Use when a Firebase deploy fails on CPU quota, takes too long, or you need to
know which functions a change will redeploy.

## Required reading

- [../rules/27-firebase-function-runtime-and-deploy-scope.md](../rules/27-firebase-function-runtime-and-deploy-scope.md)
- [../docs/operations/functions-deploy-blockers.md](../docs/operations/functions-deploy-blockers.md)

## 1. See what a change will deploy, without deploying

```bash
FIREBASE_CHANGED_FILES="functions/src/social.ts" node scripts/firebase-change-plan.mjs
```

`functionTargets: null` means a full deploy; an array means only those
functions. Add files comma-separated to model a real commit.

## 2. Check the CPU arithmetic before changing runtime options

The quota is the sum of `cpu × maxInstances` across every deployed service, and
a rollout transiently doubles the batch:

```bash
node -e "
const g = await import('./scripts/firebase-function-graph.mjs');
const n = g.buildFunctionDependencyGraph().dependencies.size;
const cpu = 0.167, maxInstances = 1, batch = 8;
console.log('deployed:', n, 'peak vCPU:', ((n + batch) * cpu * maxInstances).toFixed(1), '/ 20');
"
```

If the peak approaches 20, lower `cpu` before adding functions. Remember that
`memory` does not lower CPU — firebase-tools maps every tier at or below 1GiB
to a full vCPU.

## 3. Confirm the graph still covers every deployed function

```bash
npm --prefix functions run build
node --test tests/tooling/firebase-function-graph.test.mjs
```

This is the check that matters after refactoring `entry.ts` or moving a
handler between modules: a function the graph does not know about is never
selected, so it would keep running old code.

## 4. Read a quota failure correctly

`Quota exceeded for total allowable CPU per project per region` is arithmetic,
not flakiness. Before retrying, recompute step 2. The deploy script requeues a
quota-blocked batch once, after the others have landed and freed reservation;
if it still fails, the standing reservation is genuinely too high.

## 5. Force a full deploy deliberately

```bash
FORCE_FIREBASE_DEPLOY=1 npm run functions:deploy:batched
```

Use after changing runtime options if you need certainty, or when recovering
from a partially applied deploy.

## Traps

- The deployed count is what `entry.ts` re-exports, not what the source tree
  defines. Modules `entry.ts` does not re-export are never deployed.
- `entry.ts` can rename on re-export (`inviteFriendToGroupV150 as
  inviteFriendToGroup`). The deployed name is the alias.
- `cpu` and `concurrency` move together. Fractional CPU pins concurrency to 1.
