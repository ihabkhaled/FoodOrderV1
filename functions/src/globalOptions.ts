import { setGlobalOptions } from 'firebase-functions/v2';

/**
 * Global defaults applied to every 2nd-gen function. Imported first from
 * entry.ts so it runs before any function is defined.
 *
 * ## The regional CPU quota, and why `cpu` has to be set explicitly
 *
 * The "total allowable CPU per project per region" quota is the sum of every
 * Cloud Run service's *reservable* CPU (`cpu × maxInstances`), checked when a
 * new revision's health-check instance starts — not live usage. This project
 * is hard-capped at 20 vCPU in europe-west1 and Google gates increases behind
 * a sales request, so the reservation has to fit the ceiling.
 *
 * The trap: `memory: '256MiB'` does NOT buy a fractional CPU. firebase-tools
 * maps every memory tier at or below 1GiB to a **full vCPU**
 * (`memoryToGen2Cpu`), so leaving `cpu` unset reserved 1 vCPU per function.
 * At 50 deployed functions that is 50 vCPU against a 20 vCPU quota — well over
 * double, which is why deploys failed on whichever batch happened to tip it,
 * and why lowering `maxInstances` from 2 to 1 helped without ever being
 * enough.
 *
 * ## The arithmetic
 *
 * A rollout transiently holds the old and the new revision of every service in
 * the batch, so the peak is:
 *
 *     (DEPLOYED_COUNT + DEPLOY_BATCH_SIZE) × cpu × maxInstances < 20
 *     (50 + 8) × 0.167 × 1 = 9.7 vCPU
 *
 * That leaves about 10 vCPU of headroom — room to roughly double the function
 * count before this needs revisiting. The count is what entry.ts re-exports
 * (50), not what the source tree defines; modules entry.ts does not re-export
 * are never deployed.
 *
 * ## The tradeoff, stated plainly
 *
 * Cloud Run only permits concurrency above 1 when `cpu` is at least 1, so
 * firebase-tools pins concurrency to 1 whenever `cpu` is fractional. Each
 * instance therefore serves one request at a time, and with `maxInstances: 1`
 * each function serves one caller at a time; simultaneous callers queue rather
 * than run in parallel. These handlers are short Firestore reads and writes,
 * so the queue drains in milliseconds, and correctness never depended on
 * parallelism. Raise `cpu` and `concurrency` together only after the regional
 * quota is raised — see docs/operations/functions-deploy-blockers.md.
 */
setGlobalOptions({
  region: 'europe-west1',
  cpu: 0.167,
  maxInstances: 1,
  memory: '256MiB',
});
