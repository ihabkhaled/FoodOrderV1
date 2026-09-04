# 27 — Firebase function runtime options, Admin bootstrap, IAM, and deploy scope

## Rule

**Firebase Admin MUST be initialized before any Firestore-backed function module evaluates.**

- `functions/src/entry.ts` MUST import `./firebaseAdmin.js` before re-exporting callable or trigger modules.
- `functions/src/firebaseAdmin.ts` owns the idempotent Admin SDK bootstrap and MUST guard `initializeApp()` with `getApps()` so tests/tooling can load the bundle more than once safely.
- A module may call `getFirestore()` at module scope only while this entrypoint ordering is preserved. A new production entrypoint must import the same bootstrap first.
- Do not assume the Cloud Functions runtime calls `initializeApp()` for application code. A missing Admin app lets unauthenticated callable smoke tests pass, then makes authenticated handlers fail as soon as they touch Firestore.

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
  revision of every service in a batch, which is why the batch size is part
  of the sum.
- Raising `cpu` to 1 or above re-enables `concurrency`, and vice versa: Cloud
  Run only permits concurrency above 1 at `cpu >= 1`, so firebase-tools pins
  concurrency to 1 whenever `cpu` is fractional. Change them together, never
  one alone.
- Raise the reservation only after the regional quota is raised. The quota is
  not self-service; Google gates increases behind a sales request.

**Gen2 runtime data access MUST be explicit and least-privileged.**

- Any deployed callable that uses the Firebase Admin SDK for Firestore reads or
  writes MUST run under a service account with `roles/datastore.user` (or a
  narrower purpose-built role that is proven sufficient).
- With the repository's default Gen2 identity, the runtime principal is
  `<PROJECT_NUMBER>-compute@developer.gserviceaccount.com`.
- `.github/workflows/firebase-eventarc-iam.yml` MUST idempotently grant and
  verify `roles/datastore.user` for that runtime principal. Do not depend on a
  default service account inheriting Editor: secure-by-default IAM policy or a
  later hardening pass can remove that implicit access.
- Do NOT grant Editor or Owner to the runtime merely to repair Firestore calls.
- If a function is moved to an explicit `serviceAccount`, update the IAM
  bootstrap and its regression test in the same change before deployment.
- If the runtime no longer needs Firestore, remove the data-plane role rather
  than retaining unused access.

**Deploy scope MUST be derived, never listed.**

- Which functions a change requires is computed from the import graph in
  `scripts/firebase-function-graph.mjs`, which reads `entry.ts` for the
  deployed names — including aliases — and closes over local imports.
- Narrowing MUST fall back to a full deploy whenever it cannot be proven safe:
  a module `entry.ts` imports for side effects, a file outside the graph
  (`functions/package.json`, `tsconfig.json`, `packages/group-order-engine/**`),
  or a graph that fails to build.
- The deploy baseline MUST be the last commit whose deploy succeeded
  (tag `firebase-deployed-main`), never the previous push. A deploy that was
  skipped or cancelled leaves committed changes undeployed, and a push diff
  would drop them from scope permanently.
- The deploy MUST verify that the graph covers every name `entry.ts` exports
  before trusting a narrow plan, and deploy everything if it does not. A
  skipped function silently leaves production running old code, which is worse
  than a slow deploy.

## Motivation

The incident behind the generic **“The cloud action failed. Try again.”** message
was a missing Firebase Admin bootstrap. Multiple unrelated authenticated
operations all reached their callable, then failed when `getFirestore()` needed
the default Admin app. Existing smoke probes sent unauthenticated requests, so
they returned before exercising that dependency and incorrectly looked healthy.

The production investigation also exposed a separate hardening gap: the Gen2
runtime account had broad Editor access but no explicit `roles/datastore.user`.
The workflow now owns the narrow Firestore role so a later IAM hardening pass does
not recreate an outage when Editor is removed.

Fifty functions at an implicit `cpu: 1` reserve 50 vCPU against a 20 vCPU
quota. Deploys then fail container health checks with "Quota exceeded for total
allowable CPU" on whichever batch happens to tip the region over — an error
that reads like flakiness and is in fact arithmetic.

Separately, a hand-kept list of "isolated" files made a full deploy the common
case: any change to a shared helper redeployed all fifty functions for
thirty-five minutes, even though only four modules import it.

## Prohibited

- A deployed Functions entrypoint that exports Firestore-backed modules before Firebase Admin bootstrap.
- Calling `initializeApp()` unconditionally in reusable test/tooling paths; keep the `getApps()` guard.
- `setGlobalOptions` without an explicit `cpu`.
- Raising `maxInstances` or `cpu` without recomputing the peak against 20 vCPU.
- Adding `concurrency` above 1 while `cpu` is fractional.
- Relying on an implicit Editor grant for the Gen2 runtime's Firestore access.
- Granting Editor or Owner to the runtime as a Firestore fix.
- Changing a function runtime service account without updating IAM verification.
- Reintroducing a hand-maintained file-to-function map.
- Narrowing a deploy on an unproven assumption that a change is local.

## Enforcement

- `tests/tooling/firebase-deployment-gate.test.ts` asserts that `entry.ts` loads
  `firebaseAdmin.ts` before function exports and that the bootstrap remains
  idempotent, in addition to runtime capacity and IAM checks.
- `tests/tooling/firebase-function-graph.test.mjs` builds the real entry module
  and asserts the graph covers every deployed name.
- `.github/workflows/firebase-eventarc-iam.yml` verifies the production runtime
  Firestore role on every main push and manual bootstrap run.
- `scripts/deploy-functions-batched.mjs` re-checks graph coverage at deploy time
  and falls back to a full deploy on any gap.

## Related

[docs/operations/functions-deploy-blockers.md](../docs/operations/functions-deploy-blockers.md),
[20-release-gates.md](20-release-gates.md).
