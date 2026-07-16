import { setGlobalOptions } from 'firebase-functions/v2';
/**
 * Global defaults applied to every 2nd-gen function. Imported first from
 * entry.ts so it runs before any function is defined.
 *
 * The regional "total allowable CPU per project per region" quota is the sum of
 * every Cloud Run service's reservable CPU (cpu x maxInstances). This project's
 * quota is capped at 20,000 milli vCPU and cannot be self-raised (Google gates
 * increases behind a sales request), so maxInstances is the lever that keeps all
 * ~37 functions' combined reservation under the ceiling at deploy time. At 3,
 * with concurrency 80, each function still serves ~240 concurrent invocations
 * before scaling out. Per-function options still override these defaults; raise
 * maxInstances here if the CPU quota is ever increased.
 */
setGlobalOptions({
    region: 'europe-west1',
    maxInstances: 3,
    memory: '256MiB',
    concurrency: 80,
});
