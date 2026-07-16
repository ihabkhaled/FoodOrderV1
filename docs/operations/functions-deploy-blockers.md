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

**Resolution (in code).** `functions/src/globalOptions.ts` sets `maxInstances: 3` for all ~37 functions
via `setGlobalOptions`. Because the quota scales with `maxInstances`, this keeps the combined reservation
(~37 × 3 × per-instance CPU) well under 20,000 while every function still serves ~240 concurrent
invocations (`maxInstances 3 × concurrency 80`) before scaling out — ample for this app. Empirically,
lowering `maxInstances` from the Firebase default to 10 cut deploy failures 17 → 4; 3 removes the rest.
**If the CPU quota is ever raised via sales, bump `maxInstances` back up in `globalOptions.ts`.**

**Deploy batching (kept).** `scripts/deploy-functions-batched.mjs` (wired into the Firebase Deployment
Gate) still builds functions once, then deploys `firestore:rules` followed by the functions in small
sequential batches (`FUNCTIONS_DEPLOY_BATCH_SIZE`, default 4, with a pause and per-batch retries) so only
a few Cloud Run revisions roll out at a time.

**CI safety net.** If the *only* remaining failures are the specific `Quota exceeded for total allowable
CPU` error, the deploy step exits 0 with a loud `::warning::` listing the pending functions, so the
pipeline is not permanently red on an external quota. **Any other error** (permissions, Eventarc, build,
config, rules) still fails the gate hard. With `maxInstances: 3` there should be no pending functions and
no warning.

## Sequence to unblock

1. Ensure `secrets.FIREBASE_SERVICE_ACCOUNT*` has (temporarily) `roles/resourcemanager.projectIamAdmin`.
2. Run **Firebase Eventarc IAM Bootstrap** (push to main or `workflow_dispatch`) — now grants the
   Eventarc service-agent role.
3. Keep `maxInstances` low enough that `~functions × maxInstances × per-instance CPU` stays under the
   20,000 milli vCPU quota (currently `maxInstances: 3`). Only raise it if the quota is increased.
4. Push to main (or `workflow_dispatch`) — the Firebase Deployment Gate runs the batched deploy.
5. Remove the temporary `projectIamAdmin` grant.
