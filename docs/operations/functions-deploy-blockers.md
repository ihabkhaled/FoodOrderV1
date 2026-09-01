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

## 2. Cloud Run CPU quota — RESOLVED IN CODE via an explicit fractional `cpu`

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

## Sequence to unblock

1. Ensure `secrets.FIREBASE_SERVICE_ACCOUNT*` has (temporarily) `roles/resourcemanager.projectIamAdmin`.
2. Run **Firebase Eventarc IAM Bootstrap** (push to main or `workflow_dispatch`) — now grants the
   Eventarc service-agent role.
3. Keep `(DEPLOYED_COUNT + BATCH) × cpu × maxInstances` well under 20 vCPU — rollouts
   double-count each deploying service (currently `cpu: 0.167`, `maxInstances: 1`, peak 9.7).
   Only raise it if the quota is increased.
4. Push to main (or `workflow_dispatch`) — the Firebase Deployment Gate runs the batched deploy.
5. Remove the temporary `projectIamAdmin` grant.
