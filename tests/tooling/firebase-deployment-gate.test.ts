import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const globalOptions = readFileSync('functions/src/globalOptions.ts', 'utf8');
const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');

describe('Firebase deployment capacity gate', () => {
  it('keeps 43 functions below the regional CPU reservation ceiling', () => {
    expect(globalOptions).toContain('maxInstances: 2');
  });

  it('retries transient platform throttling before failing callable smoke tests', () => {
    expect(ciWorkflow).toContain('smoke_attempt');
    expect(ciWorkflow).toContain('"429"');
    expect(ciWorkflow).toContain('"503"');
  });
});
