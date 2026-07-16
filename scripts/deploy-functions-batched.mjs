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

const deployWithRetry = (label, args) => {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) console.log(`::warning::Retry ${attempt}/${retries} for ${label}`);
    const { ok } = firebase(args);
    if (ok) return true;
  }
  console.error(`::error::Deploy failed after retries: ${label}`);
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
let failures = 0;
if (!deployWithRetry('firestore:rules', ['deploy', '--only', 'firestore:rules', '--force'])) failures += 1;

// 4) Deploy functions in small sequential batches.
const batches = [];
for (let i = 0; i < functionNames.length; i += batchSize) batches.push(functionNames.slice(i, i + batchSize));
console.log(`Deploying ${functionNames.length} functions in ${batches.length} batches of up to ${batchSize}.`);

for (const [index, batch] of batches.entries()) {
  const only = batch.map((name) => `functions:${name}`).join(',');
  const label = `batch ${index + 1}/${batches.length} (${batch.join(', ')})`;
  console.log(`\n=== Deploying ${label} ===`);
  if (!deployWithRetry(label, ['deploy', '--only', only, '--force'])) failures += 1;
  if (index < batches.length - 1 && pauseMs > 0) {
    console.log(`Pausing ${pauseMs}ms to let Cloud Run CPU free up...`);
    await sleep(pauseMs);
  }
}

restoreConfig();
if (failures > 0) {
  console.error(`::error::${failures} deploy group(s) failed.`);
  process.exit(1);
}
console.log('\nAll rules + function batches deployed successfully.');
