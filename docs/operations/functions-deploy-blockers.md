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

2nd-gen functions run on Cloud Run; deploying the full notification + social function set at once
exceeds the project's **total allowable CPU in `europe-west1`**. This is a hard quota, not a code bug.
Resolve by any of:

1. **Request a quota increase** — GCP Console → IAM & Admin → Quotas → filter "Cloud Run Admin API,
   Total CPU allocation, europe-west1" → Edit Quotas. (Recommended.)
2. **Deploy in smaller batches** so concurrent Cloud Run rollouts don't peak the quota:
   `firebase deploy --only functions:notifyBucketSharedV150` … one/few at a time.
3. **Reduce per-function CPU/instances** (e.g. `cpu: 1`, `minInstances: 0`, `concurrency` up) in the
   function definitions to lower the aggregate CPU request.

## Sequence to unblock

1. Ensure `secrets.FIREBASE_SERVICE_ACCOUNT*` has (temporarily) `roles/resourcemanager.projectIamAdmin`.
2. Run **Firebase Eventarc IAM Bootstrap** (push to main or `workflow_dispatch`) — now grants the
   Eventarc service-agent role.
3. Raise the Cloud Run CPU quota (or deploy in batches).
4. Re-run `firebase deploy --only functions`.
5. Remove the temporary `projectIamAdmin` grant.
