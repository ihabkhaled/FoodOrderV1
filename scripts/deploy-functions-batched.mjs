#!/usr/bin/env node
/**
 * Batched Firebase deploy.
 *
 * 2nd-gen Cloud Functions run on Cloud Run; deploying all of them at once spins
 * up many concurrent Cloud Run revisions whose healthchecks together exceed the
 * project's regional "total allowable CPU" quota (the deploy failure). This
 * deploys firestore:rules, then the functions in small sequential batches so the
 * concurrent healthcheck CPU stays under the quota.
 *
 * Env:
 *   FIREBASE_PROJECT_ID            required
 *   FIREBASE_DEPLOY_TOKEN          optional (CI token; else uses GOOGLE_APPLICATION_CREDENTIALS)
 *   FUNCTIONS_DEPLOY_BATCH_SIZE    default 4
 *   FUNCTIONS_DEPLOY_PAUSE_MS      default 15000 (settle time between batches)
 *   FUNCTIONS_DEPLOY_RETRIES       default 1 (per batch; absorbs Eventarc propagation)
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) {
  console.error('::error::FIREBASE_PROJECT_ID is required.');
  process.exit(1);
}
const token = process.env.FIREBASE_DEPLOY_TOKEN ?? '';
const batchSize = Number(process.env.FUNCTIONS_DEPLOY_BATCH_SIZE ?? '4');
const pauseMs = Number(process.env.FUNCTIONS_DEPLOY_PAUSE_MS ?? '15000');
const retries = Number(process.env.FUNCTIONS_DEPLOY_RETRIES ?? '1');
const ENTRY = 'functions/lib/functions/src/entry.js';
const FIREBASE_JSON = 'firebase.json';
const isWindows = process.platform === 'win32';

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

const firebase = (args) => {
  const full = ['firebase', ...args, '--project', projectId, '--non-interactive'];
  if (token) full.push('--token', token);
  console.log(`\n$ npx ${full.join(' ')}`);
  const result = spawnSync('npx', full, { stdio: ['inherit', 'pipe', 'pipe'], encoding: 'utf8', shell: isWindows });
  const out = (result.stdout ?? '') + (result.stderr ?? '');
  process.stdout.write(out);
  // Rules/functions can deploy fine yet fail only on the optional Artifact
  // Registry cleanup policy — treat that as success (matches the prior step).
  const cleanupOnly =
    result.status !== 0 &&
    out.includes('Functions successfully deployed but could not set up cleanup policy');
  return { ok: result.status === 0 || cleanupOnly, out };
};

const failedGroups = [];
const deployWithRetry = (label, args) => {
  let lastOut = '';
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) console.log(`::warning::Retry ${attempt}/${retries} for ${label}`);
    const { ok, out } = firebase(args);
    lastOut = out;
    if (ok) return true;
  }
  console.error(`::error::Deploy failed after retries: ${label}`);
  failedGroups.push({ label, out: lastOut });
  return false;
};

// 1) Build functions once so the entry + lib are fresh, then neutralize the
//    predeploy hook so each batch does not rebuild (huge time saving).
console.log('Building functions once before batched deploy...');
const build = spawnSync('npm', ['--prefix', 'functions', 'run', 'build'], { stdio: 'inherit', shell: isWindows });
if (build.status !== 0) { console.error('::error::functions build failed'); process.exit(1); }

const originalConfig = readFileSync(FIREBASE_JSON, 'utf8');
const config = JSON.parse(originalConfig);
const restoreConfig = () => { writeFileSync(FIREBASE_JSON, originalConfig); };
process.on('exit', restoreConfig);
if (config.functions) {
  config.functions = Array.isArray(config.functions)
    ? config.functions.map((f) => ({ ...f, predeploy: [] }))
    : { ...config.functions, predeploy: [] };
  writeFileSync(FIREBASE_JSON, `${JSON.stringify(config, null, 2)}\n`);
}

// 2) Enumerate the deployable function ids from the built entry.
const mod = await import(pathToFileURL(ENTRY).href);
const functionNames = Object.keys(mod).sort();
console.log(`Discovered ${functionNames.length} functions.`);

// 3) Deploy rules first (no Cloud Run CPU cost).
deployWithRetry('firestore:rules', ['deploy', '--only', 'firestore:rules', '--force']);

// 4) Deploy functions in small sequential batches.
const batches = [];
for (let i = 0; i < functionNames.length; i += batchSize) batches.push(functionNames.slice(i, i + batchSize));
console.log(`Deploying ${functionNames.length} functions in ${batches.length} batches of up to ${batchSize}.`);

for (const [index, batch] of batches.entries()) {
  const only = batch.map((name) => `functions:${name}`).join(',');
  const label = `batch ${index + 1}/${batches.length} (${batch.join(', ')})`;
  console.log(`\n=== Deploying ${label} ===`);
  deployWithRetry(label, ['deploy', '--only', only, '--force']);
  if (index < batches.length - 1 && pauseMs > 0) {
    console.log(`Pausing ${pauseMs}ms to let Cloud Run CPU free up...`);
    await sleep(pauseMs);
  }
}

restoreConfig();

if (failedGroups.length === 0) {
  console.log('\nAll rules + function batches deployed successfully.');
  process.exit(0);
}

// The project's regional Cloud Run "total allowable CPU" quota is a hard,
// owner-side limit: once the functions that fit are deployed, the remainder
// cannot get CPU no matter how they are batched or sized. When that specific,
// documented external quota is the ONLY thing left failing, treat it as a
// warning so CI is not permanently red on an infrastructure limit — but fail
// hard on any other error (permissions, build, Eventarc, config, rules).
const QUOTA_MARK = 'Quota exceeded for total allowable CPU';
const REAL_ERROR =
  /Permission denied|Eventarc Service Agent role|Build failed|is not a valid|Invalid \w|HTTP Error: 4(01|03|09)|npm ERR!|SyntaxError|Cannot find module/i;
const quotaOnly = failedGroups.every((g) => g.out.includes(QUOTA_MARK) && !REAL_ERROR.test(g.out));

if (quotaOnly) {
  console.log(
    '::warning::Some functions could not deploy: the project reached the Cloud Run ' +
      '"total allowable CPU per project per region" quota in europe-west1. Everything that fits ' +
      'under the quota was deployed. ACTION: raise the quota (GCP Console -> IAM & Admin -> Quotas ' +
      '-> Cloud Run Admin API -> "Total CPU allocation", europe-west1), then re-run this workflow. ' +
      'See docs/operations/functions-deploy-blockers.md.',
  );
  console.log(`::warning::Pending (quota-blocked) groups: ${failedGroups.map((g) => g.label).join(' | ')}`);
  process.exit(0);
}

console.error(`::error::${failedGroups.length} deploy group(s) failed with non-quota errors.`);
process.exit(1);
