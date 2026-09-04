import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const globalOptions = readFileSync('functions/src/globalOptions.ts', 'utf8');
const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const runtimeIamWorkflow = readFileSync(
  '.github/workflows/firebase-eventarc-iam.yml',
  'utf8',
);

describe('Firebase deployment capacity gate', () => {
  it('keeps the standing CPU reservation well under the regional ceiling', () => {
    // A rollout reserves CPU for the old and the new revision of every service
    // in a batch, so the standing reservation must leave headroom, not sit at
    // the quota. At maxInstances 2 the reservation of 45 functions was the
    // whole 20,000 milli-vCPU quota and deploys failed container health checks.
    expect(globalOptions).toContain('maxInstances: 1');
    expect(globalOptions).not.toContain('maxInstances: 2');
  });

  it('retries transient platform throttling before failing callable smoke tests', () => {
    expect(ciWorkflow).toContain('smoke_attempt');
    expect(ciWorkflow).toContain('"429"');
    expect(ciWorkflow).toContain('"503"');
  });

  it('keeps Firestore access on the Gen2 runtime service account', () => {
    expect(runtimeIamWorkflow).toContain('roles/datastore.user');
    expect(runtimeIamWorkflow).toContain('compute@developer.gserviceaccount.com');
    expect(runtimeIamWorkflow).toContain('Verify Gen2 runtime Firestore IAM');
  });
});