# Firebase Functions runtime and deploy blockers

This page records production-level Firebase constraints that are easy to miss in local tests. Review it whenever the Admin bootstrap, Functions runtime identity, region, deployment workflow, or Firestore storage boundary changes.

## 0. Authenticated callables failed before Firestore — FIXED IN CODE

**Incident symptom:** unrelated authenticated operations — including opening an order session, creating a sharing link, and placing/finalizing a group order — all surfaced **“The cloud action failed. Try again.”**

The shared defect was not the client callable names or region. The Functions bundle called `getFirestore()` throughout the server modules but never initialized the default Firebase Admin app. `functions/src/entry.ts` exported those Firestore-backed modules directly, and there was no `initializeApp()` anywhere in the Functions source.

This escaped the deployment smoke tests because those probes intentionally send unauthenticated requests and expect `UNAUTHENTICATED`. They return before the handler executes the Firestore path, so a callable can look reachable while every authenticated operation fails later in server execution.

**Resolution:** `functions/src/firebaseAdmin.ts` now performs an idempotent Admin SDK bootstrap:

- inspect `getApps()`,
- call `initializeApp()` only when no default app exists,
- import that bootstrap first from `functions/src/entry.ts`, before Firestore-backed callable/trigger modules evaluate.

`tests/tooling/firebase-deployment-gate.test.ts` protects the entrypoint ordering and bootstrap contract.

**Why this shape:** several function modules create a Firestore handle at module scope. Initializing once at the production entrypoint fixes the whole server bundle without duplicating bootstrap logic in every module.

**When not to use this pattern:** if a second Functions entrypoint is introduced, it must import the bootstrap itself; do not assume importing the current `entry.ts` indirectly. If all module-scope Admin SDK access is later removed and initialization moves into a dedicated runtime factory, update the regression test and this document together.

**Business meaning:** a missing Admin app makes multiple unrelated collaborative-order features fail after authentication, so the UI can misleadingly look like several separate cloud outages. Treat this bootstrap as a production dependency, not setup boilerplate.

**Operational consequence:** this code change requires the Functions bundle to redeploy. IAM changes alone do not repair an already deployed bundle that lacks `initializeApp()`.

**Staleness trigger:** review this section when `functions/src/entry.ts`, `functions/src/firebaseAdmin.ts`, Firebase Admin SDK initialization, or server module-level `getFirestore()` usage changes.

## 1. Gen2 callable Firestore IAM — HARDENED IN WORKFLOW

Authenticated callable operations use the Firebase Admin SDK to read or write Firestore. On 2nd-generation Functions, these handlers run as the project's runtime service account; in this repository that is the default Compute Engine account:

`<PROJECT_NUMBER>-compute@developer.gserviceaccount.com`

During the incident investigation, production showed that this account already inherited `roles/editor`, so missing Firestore IAM was **not the root cause of the current outage**. However, relying on broad inherited Editor access is fragile and unnecessarily permissive.

The runtime now also receives the narrow Firestore data-plane role `roles/datastore.user`. `.github/workflows/firebase-eventarc-iam.yml` owns this binding. On every main push or manual run it:

- resolves the Gen2 runtime compute service account,
- idempotently grants `roles/datastore.user` when it is missing, and
- verifies the role before continuing to the Eventarc-specific bootstrap.

This binding is for the trusted server runtime only. It does not bypass callable authorization checks or client Firestore Security Rules, and it must not be widened to Editor or Owner merely to make a callable work.

**When not to use this pattern:** if Functions are moved to a dedicated `serviceAccount`, grant the Firestore role to that explicit runtime identity instead and update the workflow/test in the same change. If callables stop using Firestore, remove the role rather than keeping unused access.

**Operational consequence:** the GitHub deployer must be able to update project IAM for the one-time grant. If it cannot, temporarily grant the deployer `roles/resourcemanager.projectIamAdmin`, rerun **Firebase Runtime and Eventarc IAM Bootstrap**, confirm the verification step passes, then remove the elevated deployer role.

**Staleness trigger:** review this section when Firebase function service accounts, `.github/workflows/firebase-eventarc-iam.yml`, or the callable persistence backend changes.

## 2. Eventarc Service Agent permission — FIXED in the workflow

```
Permission denied while using the Eventarc Service Agent ... verify that it has
Eventarc Service Agent role.
```

`.github/workflows/firebase-eventarc-iam.yml` granted roles to the Pub/Sub agent and the compute
account but never to the **Eventarc service agent** itself
(`service-<PROJECT_NUMBER>@gcp-sa-eventarc.iam.gserviceaccount.com`), which is the principal named in
the error. The workflow now:
- enables `eventarc.googleapis.com` (the agent only exists once the API is enabled), and
- binds `roles/eventarc.serviceAgent` to that agent (and verifies it).

Google also emits this transiently on the *first* 2nd-gen deploy ("Retry in a few minutes" while the
service agent propagates), so after the IAM bootstrap runs, re-running the functions deploy should
succeed.

## 3. Cloud Run CPU quota — RESOLVED IN CODE via an explicit fractional `cpu`

```
Could not create or update Cloud Run service notifyfriendrequestv150, Container Healthcheck failed.
Quota exceeded for total allowable CPU per project per region.
```

2nd-gen functions run on Cloud Run. The **"total allowable CPU per project per region"** quota is the
sum of every service's *reservable* CPU (`cpu × maxInstances`), enforced when each new revision's
healthcheck instance starts — **not** live usage (the console can read ~5% used and the deploy still
fails). This project's quota is **hard-capped at 20,000 milli vCPU in `europe-west1` and cannot be
self-raised**: the GCP console routes any increase through a **sales/support request** ("contact
sales"), so raising it is not a viable unblock.

**Resolution (in code).** `functions/src/globalOptions.ts` sets `cpu: 0.167` and
`maxInstances: 1` explicitly.

The trap that kept this failing: **`memory` does not buy a fractional CPU.**
firebase-tools maps every memory tier at or below 1GiB to a full vCPU
(`memoryToGen2Cpu`), so `memory: '256MiB'` with `cpu` unset reserved **1 vCPU per
function**. At 50 deployed functions that is 50 vCPU against a 20 vCPU quota —
which is why deploys failed on whichever batch tipped the region over, and why
dropping `maxInstances` from 2 to 1 helped without ever being enough.

The peak must satisfy `(DEPLOYED_COUNT + BATCH) × cpu × maxInstances < 20`,
because a rollout transiently holds the old and new revision of every service in
the batch. Today: `(50 + 8) × 0.167 × 1 = 9.7 vCPU`, leaving ~10 vCPU of
headroom. `DEPLOYED_COUNT` is what `functions/src/entry.ts` re-exports (50), not
what the source tree defines (62) — modules `entry.ts` does not re-export are
never deployed.

**Tradeoff:** Cloud Run permits concurrency above 1 only at `cpu >= 1`, so
firebase-tools pins concurrency to 1 whenever `cpu` is fractional. Each function
serves one caller at a time and simultaneous callers queue. These handlers are
short Firestore reads and writes, so the queue drains in milliseconds. Raise
`cpu` and `concurrency` together, and only after the quota is raised.

**Deploy scope is derived from the import graph.**
`scripts/firebase-function-graph.mjs` reads `entry.ts` for the deployed names —
including aliases such as `inviteFriendToGroupV150 as inviteFriendToGroup` — then
closes over local imports, so a change deploys only the functions that actually
depend on it. It replaced a hand-kept list of three "isolated" files that made a
full deploy the common case.

Measured scope for representative changes:

| Change | Functions deployed | Batches |
|---|---|---|
| Frontend or docs only | 0 | 0 |
| Firestore rules only | 0 (rules only) | 0 |
| One leaf module (`inviteLinks.ts`) | 5 | 1 |
| Shared helper (`notificationCore.ts`) | 37 | 5 |
| `socialDomain.ts` | 18 | 3 |
| `globalOptions.ts`, `entry.ts`, deps, `firebase.json` | 50 (full) | 7 |

Narrowing falls back to a full deploy whenever it cannot be proven safe, and
`scripts/deploy-functions-batched.mjs` re-checks at deploy time that the graph
covers every exported name — deploying everything if it does not, because a
skipped function silently leaves production on old code.

See [rules/27-firebase-function-runtime-and-deploy-scope.md](../../rules/27-firebase-function-runtime-and-deploy-scope.md)
and [skills/diagnose-firebase-deploy-scope.md](../../skills/diagnose-firebase-deploy-scope.md).

**The deploy baseline is what is live, not the previous push.** A successful
deploy tags its commit `firebase-deployed-main`, and the next run diffs from
that tag. Diffing from the previous push loses work: the `cpu` fix in 8170e63
was skipped because an unrelated job failed, and the following commit - a
test-only change - correctly resolved to "nothing to deploy", leaving a
committed fix undeployed with nothing left to notice. If the marker is missing
(first run after adopting this), the planner falls back to the push diff rather
than forcing a full deploy forever. To force one deliberately, run the CI
workflow from the Actions tab: `workflow_dispatch` always deploys everything.

**CI behaviour on quota.** If the *only* remaining failures are the specific `Quota exceeded for total
allowable CPU` error, the deploy step fails with an explicit list of the pending groups — a release is
never marked green while planned Firebase targets are still running old code. **Any other error**
(permissions, Eventarc, build, config, rules) also fails the gate hard. A quota-blocked batch is
requeued once, after the others have landed and freed reservation. With the explicit `cpu: 0.167` the
peak reservation is 9.7 of 20 vCPU, so quota failures should no longer occur at all.

## 4. Project billing write denial — EXTERNAL BLOCKER, FAILS FAST

```
Request to .../functions:generateUploadUrl had HTTP Error: 403,
Write access to project 'foodorder-c997c' was denied:
please check billing account associated and retry
```

This is not a Functions source, IAM-runtime, Eventarc, or CPU-quota failure. The
Cloud Functions API is refusing the upload before any function revision can be
created because Google Cloud considers the project's billing-backed write access
unavailable.

**Required owner action:** open Google Cloud Billing for project
`foodorder-c997c` and verify that the project is linked to an **active billing
account** that is not suspended, closed, or otherwise blocking paid resource
writes. Do not keep retrying the deploy until that state is corrected; the exact
same `generateUploadUrl` request will continue to return 403.

The Firebase CLI also prints a generic App Engine suggestion around this error.
For this incident, the decisive line is the Cloud Functions v2
`generateUploadUrl` 403 explicitly naming the billing account, so treat billing
as the blocker unless a later run returns a different error.

`scripts/deploy-functions-batched.mjs` now recognizes this exact billing denial
as non-transient. It stops after the first failed function batch, skips all
remaining batches, and prints the project-level billing action instead of
wasting retries across every function group.

**Operational consequence:** the Admin-bootstrap fix remains committed but is
**not live** until a Functions deploy succeeds and `firebase-deployed-main` moves
to a commit containing that fix.

**Staleness trigger:** review this section if Google changes the Cloud Functions
billing error text or if the deployment path stops using
`functions:generateUploadUrl`.

## Sequence to unblock

1. Ensure the deployed Functions entrypoint includes `functions/src/firebaseAdmin.ts`; code changes to this bootstrap require a Functions redeploy.
2. Verify Google Cloud project `foodorder-c997c` is linked to an active billing account. If `generateUploadUrl` returns the billing 403 above, fix billing before retrying CI.
3. Push to `main` (or run `workflow_dispatch`) so the Firebase Deployment Gate deploys the changed Functions bundle.
4. The separate **Firebase Runtime and Eventarc IAM Bootstrap** grants/verifies `roles/datastore.user` for the Gen2 runtime account.
5. If that IAM mutation is denied, temporarily grant the GitHub deployer `roles/resourcemanager.projectIamAdmin`, rerun the bootstrap, then remove the elevated role.
6. Keep `(DEPLOYED_COUNT + BATCH) × cpu × maxInstances` well under 20 vCPU — rollouts double-count each deploying service (currently `cpu: 0.167`, `maxInstances: 1`, peak 9.7). Only raise it if the quota is increased.
7. Retest an authenticated Firestore-backed callable such as opening an order session, creating an invite link, and finalizing a group order.
