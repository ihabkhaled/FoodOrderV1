import { setGlobalOptions } from 'firebase-functions/v2';

/**
 * Global defaults applied to every 2nd-gen function. Imported first from
 * entry.ts so it runs before any function is defined.
 *
 * The regional "total allowable CPU per project per region" quota is the sum of
 * every Cloud Run service's reservable CPU (cpu x maxInstances). This project's
 * quota is capped at 20,000 milli vCPU and cannot be self-raised (Google gates
 * increases behind a sales request), so maxInstances is the lever that keeps
 * the combined reservation under the ceiling at deploy time.
 *
 * maxInstances is 1 because a deploy temporarily reserves CPU for the old and
 * the new revision of every service in the batch. At 2, the standing
 * reservation of 45 functions sat essentially at the ceiling, so rollouts had
 * no headroom left and failed container health checks with "Quota exceeded for
 * total allowable CPU" — repeatedly, on whichever batch the region happened to
 * be tight for. At 1 the standing reservation is roughly half the quota, which
 * leaves room to deploy batches of eight concurrently. Concurrency 80 means a
 * single instance still serves up to 80 simultaneous invocations, far above
 * this application's traffic. Raise maxInstances only after the regional CPU
 * quota increases.
 */
setGlobalOptions({
  region: 'europe-west1',
  maxInstances: 1,
  memory: '256MiB',
  concurrency: 80,
});
