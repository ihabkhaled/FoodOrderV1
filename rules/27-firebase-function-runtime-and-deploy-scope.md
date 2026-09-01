# 27 — Firebase function runtime options and deploy scope

## Rule

**Every deployed function MUST fit the regional CPU quota, and the fit MUST be
arithmetic rather than hope.**

- `functions/src/globalOptions.ts` MUST set `cpu` explicitly. Leaving it unset
  reserves a **full vCPU per function** — `memory` does not buy a fractional
  CPU, because firebase-tools maps every tier at or below 1GiB to `cpu: 1`
  (`memoryToGen2Cpu`).
- The peak reservation MUST satisfy:

  ```
  (DEPLOYED_COUNT + FUNCTIONS_DEPLOY_BATCH_SIZE) × cpu × maxInstances < 20
  ```

  where `DEPLOYED_COUNT` is what `functions/src/entry.ts` re-exports, not what
  the source tree defines. A rollout transiently holds the old and the new
  revision of every service in the batch, which is why the batch size is part
  of the sum.
- Raising `cpu` to 1 or above re-enables `concurrency`, and vice versa: Cloud
  Run only permits concurrency above 1 at `cpu >= 1`, so firebase-tools pins
  concurrency to 1 whenever `cpu` is fractional. Change them together, never
  one alone.
- Raise the reservation only after the regional quota is raised. The quota is
  not self-service; Google gates increases behind a sales request.

**Deploy scope MUST be derived, never listed.**

- Which functions a change requires is computed from the import graph in
  `scripts/firebase-function-graph.mjs`, which reads `entry.ts` for the
  deployed names — including aliases — and closes over local imports.
- Narrowing MUST fall back to a full deploy whenever it cannot be proven safe:
  a module `entry.ts` imports for side effects, a file outside the graph
  (`functions/package.json`, `tsconfig.json`, `packages/group-order-engine/**`),
  or a graph that fails to build.
- The deploy MUST verify that the graph covers every name `entry.ts` exports
  before trusting a narrow plan, and deploy everything if it does not. A
  skipped function silently leaves production running old code, which is worse
  than a slow deploy.

## Motivation

Fifty functions at an implicit `cpu: 1` reserve 50 vCPU against a 20 vCPU
quota. Deploys then fail container health checks with "Quota exceeded for total
allowable CPU" on whichever batch happens to tip the region over — an error
that reads like flakiness and is in fact arithmetic.

Separately, a hand-kept list of "isolated" files made a full deploy the common
case: any change to a shared helper redeployed all fifty functions for
thirty-five minutes, even though only four modules import it.

## Prohibited

- `setGlobalOptions` without an explicit `cpu`.
- Raising `maxInstances` or `cpu` without recomputing the peak against 20 vCPU.
- Adding `concurrency` above 1 while `cpu` is fractional.
- Reintroducing a hand-maintained file-to-function map.
- Narrowing a deploy on an unproven assumption that a change is local.

## Enforcement

- `tests/tooling/firebase-function-graph.test.mjs` builds the real entry module
  and asserts the graph covers every deployed name.
- `tests/tooling/firebase-deployment-gate.test.ts` asserts the runtime options.
- `scripts/deploy-functions-batched.mjs` re-checks coverage at deploy time and
  falls back to a full deploy on any gap.

## Related

[docs/operations/functions-deploy-blockers.md](../docs/operations/functions-deploy-blockers.md),
[20-release-gates.md](20-release-gates.md).
