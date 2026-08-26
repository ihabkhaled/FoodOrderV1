#!/usr/bin/env node
/**
 * Change-aware batched Firebase deploy.
 *
 * Frontend/docs-only pushes skip Firebase completely. Rules-only pushes avoid
 * the function build. Isolated function modules deploy only their exported
 * endpoints; shared/config changes safely fall back to all functions.
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

const QUOTA_MARK = 'Quota exceeded for total allowable CPU';

const failedGroups = [];
const attemptDeploy = (label, args) => {
  let lastOut = '';
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) console.log(`::warning::Retry ${attempt}/${retries} for ${label}`);
    const { ok, out } = firebase(args);
    lastOut = out;
    if (ok) return { ok: true, out };
  }
  return { ok: false, out: lastOut };
};
const deployWithRetry = (label, args) => {
  const { ok, out } = attemptDeploy(label, args);
  if (!ok) {
    console.error(`::error::Deploy failed after retries: ${label}`);
    failedGroups.push({ label, out });
  }
  return ok;
};

let originalConfig = null;
const restoreConfig = () => {
  if (originalConfig !== null) writeFileSync(FIREBASE_JSON, originalConfig);
};
process.on('exit', restoreConfig);

let functionNames = [];
if (changePlan.deployFunctions) {
  console.log('Building functions once before deploy...');
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
  const allFunctionNames = Object.keys(module).sort();
  if (Array.isArray(changePlan.functionTargets) && changePlan.functionTargets.length > 0) {
    const available = new Set(allFunctionNames);
    const missing = changePlan.functionTargets.filter((name) => !available.has(name));
    if (missing.length > 0) {
      console.error(`::error::Planned Firebase targets are not exported: ${missing.join(', ')}`);
      process.exit(1);
    }
    functionNames = [...changePlan.functionTargets];
    console.log(`Surgical deploy: ${functionNames.length}/${allFunctionNames.length} exported functions changed.`);
  } else {
    functionNames = allFunctionNames;
    console.log(`Safe full-function fallback: ${functionNames.length} exported functions.`);
  }
}

if (changePlan.deployRules) {
  deployWithRetry('firestore:rules', ['deploy', '--only', 'firestore:rules', '--force']);
} else {
  console.log('Firestore rules unchanged. Skipping rules deployment.');
}

if (changePlan.deployFunctions) {
  const batches = [];
  for (let index = 0; index < functionNames.length; index += batchSize) {
    batches.push(functionNames.slice(index, index + batchSize));
  }
  console.log(`Deploying ${functionNames.length} functions in ${batches.length} batch(es) of up to ${batchSize}.`);

  // A batch that fails purely on CPU quota is requeued to the end instead of
  // being declared dead: every batch that lands lowers the standing
  // reservation (each rollout replaces the previous revision's configuration),
  // so by the time the queue drains, the region usually has the headroom the
  // batch was missing. This is what turns "failed at the end, rerun the whole
  // 30-minute deploy" into one extra attempt inside the same run.
  const requeued = [];
  const deployBatch = (batch, index, total, finalPass) => {
    const only = batch.map((name) => `functions:${name}`).join(',');
    const label = `batch ${index}/${total} (${batch.join(', ')})`;
    console.log(`\n=== Deploying ${label} ===`);
    const { ok, out } = attemptDeploy(label, ['deploy', '--only', only, '--force']);
    if (ok) return;
    if (!finalPass && out.includes(QUOTA_MARK)) {
      console.log(`::warning::${label} hit the CPU quota; requeued for after the other batches.`);
      requeued.push(batch);
      return;
    }
    console.error(`::error::Deploy failed after retries: ${label}`);
    failedGroups.push({ label, out });
  };

  for (const [index, batch] of batches.entries()) {
    deployBatch(batch, index + 1, batches.length, false);
    if (index < batches.length - 1 && pauseMs > 0) {
      console.log(`Pausing ${pauseMs}ms to let Cloud Run CPU free up...`);
      await sleep(pauseMs);
    }
  }

  if (requeued.length > 0) {
    console.log(`\nRetrying ${requeued.length} quota-blocked batch(es) now that earlier rollouts freed reservation...`);
    await sleep(Math.max(pauseMs, 30000));
    for (const [index, batch] of requeued.entries()) {
      deployBatch(batch, index + 1, requeued.length, true);
      if (index < requeued.length - 1 && pauseMs > 0) await sleep(pauseMs);
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
    changePlan.deployFunctions ? `${functionNames.length} Cloud Function(s)` : '',
  ].filter(Boolean);
  console.log(`\nFirebase deployment complete: ${deployed.join(' + ')}.`);
  process.exit(0);
}

const REAL_ERROR =
  /Permission denied|Eventarc Service Agent role|Build failed|is not a valid|Invalid \w|HTTP Error: 4(01|03|09)|npm ERR!|SyntaxError|Cannot find module/iu;
const quotaOnly = failedGroups.every(
  (group) => group.out.includes(QUOTA_MARK) && !REAL_ERROR.test(group.out),
);

if (quotaOnly) {
  console.error(
    '::error::Firebase deployment is incomplete because Cloud Run CPU quota blocked one or more planned function batches.',
  );
  console.error(
    `::error::Pending groups: ${failedGroups.map((group) => group.label).join(' | ')}`,
  );
  console.error(
    'A release cannot be marked green while planned Firebase targets are still pending. Re-run after capacity is available.',
  );
  process.exit(1);
}

console.error(`::error::${failedGroups.length} deploy group(s) failed with non-quota errors.`);
process.exit(1);
