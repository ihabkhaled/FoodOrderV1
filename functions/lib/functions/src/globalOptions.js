import { setGlobalOptions } from 'firebase-functions/v2';
/**
 * Global defaults applied to every 2nd-gen function. Imported first from
 * entry.ts so it runs before any function is defined.
 *
 * Capping maxInstances bounds the aggregate Cloud Run CPU the function set can
 * reserve, keeping the project under its regional "total allowable CPU" quota
 * (the deploy failure) and preventing runaway scaling. Per-function options
 * still override these defaults.
 */
setGlobalOptions({
    region: 'europe-west1',
    maxInstances: 10,
    memory: '256MiB',
    concurrency: 80,
});
