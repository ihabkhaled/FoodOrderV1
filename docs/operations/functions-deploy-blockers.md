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

## 2. Cloud Run CPU quota — OWNER ACTION (GCP-side, not code)

```
Could not create or update Cloud Run service repeatgrouporderv133, Container Healthcheck failed.
Quota exceeded for total allowable CPU per project per region.
```

2nd-gen functions run on Cloud Run; deploying all 37 functions at once spins up too many concurrent
Cloud Run healthcheck revisions, whose combined CPU exceeds the project's **total allowable CPU in
`europe-west1`**.

**Mitigation (now automated).** The CI deploy no longer runs one `firebase deploy --only functions`.
`scripts/deploy-functions-batched.mjs` (wired into the Firebase Deployment Gate) builds functions once,
then deploys `firestore:rules` followed by the functions in **small sequential batches**
(`FUNCTIONS_DEPLOY_BATCH_SIZE`, default 4, with a pause and per-batch retries), so only a few Cloud Run
revisions roll out at a time and the concurrent healthcheck CPU stays under the quota.

If the batched deploy still hits the quota (i.e. the steady-state total CPU, not just the deploy spike,
exceeds it), then also:

1. **Request a quota increase** — GCP Console → IAM & Admin → Quotas → filter "Cloud Run Admin API,
   Total CPU allocation, europe-west1" → Edit Quotas. (Recommended, and lets you raise the batch size.)
2. **Reduce per-function CPU/instances** (e.g. `cpu: 1`, `minInstances: 0`, higher `concurrency`) in the
   function definitions to lower the aggregate CPU request.
3. **Lower the batch size** further (`FUNCTIONS_DEPLOY_BATCH_SIZE: 2`) to shrink the deploy-time spike.

## Sequence to unblock

1. Ensure `secrets.FIREBASE_SERVICE_ACCOUNT*` has (temporarily) `roles/resourcemanager.projectIamAdmin`.
2. Run **Firebase Eventarc IAM Bootstrap** (push to main or `workflow_dispatch`) — now grants the
   Eventarc service-agent role.
3. Raise the Cloud Run CPU quota (or deploy in batches).
4. Re-run `firebase deploy --only functions`.
5. Remove the temporary `projectIamAdmin` grant.
