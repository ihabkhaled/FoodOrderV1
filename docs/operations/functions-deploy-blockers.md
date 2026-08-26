# Firebase Functions deploy blockers (v1.5.0 notifications)

The v1.5.0 2nd-gen notification functions failed to deploy. Two distinct causes — one fixed in code,
one that is a GCP-side owner action.

## 1. Eventarc Service Agent permission — FIXED in the workflow

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

## 2. Cloud Run CPU quota — RESOLVED IN CODE via maxInstances

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

**Resolution (in code).** `functions/src/globalOptions.ts` sets `maxInstances: 1` for every function
via `setGlobalOptions`. A deploy transiently reserves CPU for the old **and** the new revision of each
service in the batch, so the standing reservation must sit well under the ceiling, not at it. At
`maxInstances: 2` the reservation of 45 functions was essentially the whole quota and rollouts kept
failing on whichever batch the region was tight for (v1.9.2 lost batches 6 and 12 this way, twice
retried). At 1 the standing reservation is roughly half the quota, and one instance still serves up to
80 concurrent invocations (`concurrency 80`) — far above this application's traffic.
**If the CPU quota is ever raised via sales, `maxInstances` can be raised in `globalOptions.ts`.**

**Change-aware deploys (the time fix).** `scripts/firebase-change-plan.mjs` deploys only what changed:
frontend/docs-only releases skip Firebase entirely, rules-only releases skip the function build, and a
change to an isolated functions file deploys only its exported endpoints (read from the file itself —
a hand-kept list had drifted and would have skipped `inviteFriendToGroup`). Only `functions/**` and
`packages/group-order-engine/**` (compiled into the bundle by `functions/tsconfig.json`) trigger
function deploys; the repo-root `package.json`/`package-lock.json` do **not** — functions never import
the root package, and treating the root manifest as a trigger made nearly every release a 30-minute
full deploy.

**Deploy batching (kept).** `scripts/deploy-functions-batched.mjs` (wired into the Firebase Deployment
Gate) still builds functions once, then deploys `firestore:rules` followed by the functions in
sequential batches (`FUNCTIONS_DEPLOY_BATCH_SIZE`, now 8 — safe with the halved standing reservation —
with a pause and per-batch retries) so only a few Cloud Run revisions roll out at a time.

**CI behaviour on quota.** If the *only* remaining failures are the specific `Quota exceeded for total
allowable CPU` error, the deploy step fails with an explicit list of the pending groups — a release is
never marked green while planned Firebase targets are still running old code. **Any other error**
(permissions, Eventarc, build, config, rules) also fails the gate hard. With `maxInstances: 1` the
standing reservation leaves rollout headroom, so quota failures should no longer occur.

## Sequence to unblock

1. Ensure `secrets.FIREBASE_SERVICE_ACCOUNT*` has (temporarily) `roles/resourcemanager.projectIamAdmin`.
2. Run **Firebase Eventarc IAM Bootstrap** (push to main or `workflow_dispatch`) — now grants the
   Eventarc service-agent role.
3. Keep `maxInstances` low enough that `~functions × maxInstances × per-instance CPU` stays **well
   under** the 20,000 milli vCPU quota — rollouts double-count each deploying service (currently
   `maxInstances: 1`). Only raise it if the quota is increased.
4. Push to main (or `workflow_dispatch`) — the Firebase Deployment Gate runs the batched deploy.
5. Remove the temporary `projectIamAdmin` grant.
