#!/usr/bin/env node
/**
 * Change-aware batched Firebase deploy.
 *
 * Frontend/docs-only pushes skip Firebase completely. Rules-only pushes avoid
 * the function build. Function changes still deploy in small sequential batches
 * so concurrent Cloud Run health checks stay below the regional CPU quota.
 *
 * Env:
 *   FIREBASE_PROJECT_ID            required when a target changed
 *   FIREBASE_DEPLOY_TOKEN          optional (CI token; else uses GOOGLE_APPLICATION_CREDENTIALS)
 *   FORCE_FIREBASE_DEPLOY          set to 1 for an explicit full deploy
 *   FIREBASE_CHANGED_FILES         optional comma/newline-separated test override
 *   FUNCTIONS_DEPLOY_BATCH_SIZE    default 4
 *   FUNCTIONS_DEPLOY_PAUSE_MS      default 15000 (settle time between batches)
 *   FUNCTIONS_DEPLOY_RETRIES       default 1 (per batch; absorbs Eventarc propagation)
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { resolveFirebaseChangePlan } from './firebase-change-plan.mjs';

const changePlan = resolveFirebaseChangePlan();
console.log('Firebase deployment plan:');
console.log(JSON.stringify(changePlan, null, 2));

if (!changePlan.deployFunctions && !changePlan.deployRules) {
  console.log('No Firebase targets changed. Skipping deployment.');
  process.exit(0);
}

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

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const firebase = (args) => {
  const full = ['firebase', ...args, '--project', projectId, '--non-interactive'];
  if (token) full.push('--token', token);
  console.log(`\n$ npx ${full.join(' ')}`);
  const result = spawnSync('npx', full, {
    stdio: ['inherit', 'pipe', 'pipe'],
    encoding: 'utf8',
    shell: isWindows,
  });
  const out = (result.stdout ?? '') + (result.stderr ?? '');
  process.stdout.write(out);
  const cleanupOnly =
    result.status !== 0 &&
    out.includes(
      'Functions successfully deployed but could not set up cleanup policy',
    );
  return { ok: result.status === 0 || cleanupOnly, out };
};

const failedGroups = [];
const deployWithRetry = (label, args) => {
  let lastOut = '';
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) {
      console.log(`::warning::Retry ${attempt}/${retries} for ${label}`);
    }
    const { ok, out } = firebase(args);
    lastOut = out;
    if (ok) return true;
  }
  console.error(`::error::Deploy failed after retries: ${label}`);
  failedGroups.push({ label, out: lastOut });
  return false;
};

let originalConfig = null;
const restoreConfig = () => {
  if (originalConfig !== null) writeFileSync(FIREBASE_JSON, originalConfig);
};
process.on('exit', restoreConfig);

let functionNames = [];
if (changePlan.deployFunctions) {
  console.log('Building functions once before batched deploy...');
  const build = spawnSync('npm', ['--prefix', 'functions', 'run', 'build'], {
    stdio: 'inherit',
    shell: isWindows,
  });
  if (build.status !== 0) {
    console.error('::error::functions build failed');
    process.exit(1);
  }

  originalConfig = readFileSync(FIREBASE_JSON, 'utf8');
  const config = JSON.parse(originalConfig);
  if (config.functions) {
    config.functions = Array.isArray(config.functions)
      ? config.functions.map((entry) => ({ ...entry, predeploy: [] }))
      : { ...config.functions, predeploy: [] };
    writeFileSync(FIREBASE_JSON, `${JSON.stringify(config, null, 2)}\n`);
  }

  const module = await import(pathToFileURL(ENTRY).href);
  functionNames = Object.keys(module).sort();
  console.log(`Discovered ${functionNames.length} functions.`);
}

if (changePlan.deployRules) {
  deployWithRetry('firestore:rules', [
    'deploy',
    '--only',
    'firestore:rules',
    '--force',
  ]);
} else {
  console.log('Firestore rules unchanged. Skipping rules deployment.');
}

if (changePlan.deployFunctions) {
  const batches = [];
  for (let index = 0; index < functionNames.length; index += batchSize) {
    batches.push(functionNames.slice(index, index + batchSize));
  }
  console.log(
    `Deploying ${functionNames.length} functions in ${batches.length} batches of up to ${batchSize}.`,
  );

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
} else {
  console.log('Cloud Functions unchanged. Skipping function build and deployment.');
}

restoreConfig();
originalConfig = null;

if (failedGroups.length === 0) {
  const deployed = [
    changePlan.deployRules ? 'Firestore rules' : '',
    changePlan.deployFunctions ? 'Cloud Functions' : '',
  ].filter(Boolean);
  console.log(`\nFirebase deployment complete: ${deployed.join(' + ')}.`);
  process.exit(0);
}

const QUOTA_MARK = 'Quota exceeded for total allowable CPU';
const REAL_ERROR =
  /Permission denied|Eventarc Service Agent role|Build failed|is not a valid|Invalid \w|HTTP Error: 4(01|03|09)|npm ERR!|SyntaxError|Cannot find module/iu;
const quotaOnly = failedGroups.every(
  (group) => group.out.includes(QUOTA_MARK) && !REAL_ERROR.test(group.out),
);

if (quotaOnly) {
  console.log(
    '::warning::Some functions could not deploy: the project reached the Cloud Run ' +
      '"total allowable CPU per project per region" quota in europe-west1. Everything that fits ' +
      'under the quota was deployed. ACTION: raise the quota (GCP Console -> IAM & Admin -> Quotas ' +
      '-> Cloud Run Admin API -> "Total CPU allocation", europe-west1), then re-run this workflow. ' +
      'See docs/operations/functions-deploy-blockers.md.',
  );
  console.log(
    `::warning::Pending (quota-blocked) groups: ${failedGroups.map((group) => group.label).join(' | ')}`,
  );
  process.exit(0);
}

console.error(
  `::error::${failedGroups.length} deploy group(s) failed with non-quota errors.`,
);
process.exit(1);
