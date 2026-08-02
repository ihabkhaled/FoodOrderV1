import assert from 'node:assert/strict';
import test from 'node:test';

import { composeReleaseNotes } from '../../tools/release/compose-release-notes.mjs';

const NOTES = `# FoodOrderV1 v1.8.0

## Highlights

- Something a reader actually cares about.
`;

test('a release publishes its notes, not a generated sentence', () => {
  const body = composeReleaseNotes({
    version: '1.8.0',
    notes: NOTES,
    buildVersion: '1.8.0-dev.254',
    commit: '5c9ada3',
    branch: 'release/1.8.0/bucket-templates-ux',
    prerelease: true,
  });

  assert.match(body, /- Something a reader actually cares about\./u);
  assert.match(body, /## This build/u);
  assert.match(body, /`1\.8\.0-dev\.254`/u);
  assert.match(body, /`5c9ada3`/u);
  assert.match(body, /release\/1\.8\.0\/bucket-templates-ux/u);
  assert.match(body, /branch gate passed/u);
});

test('a main release says so, and omits the branch line', () => {
  const body = composeReleaseNotes({
    version: '1.8.0',
    notes: NOTES,
    buildVersion: '1.8.0-3',
    commit: 'abc1234',
  });

  assert.match(body, /gate passed on `main`/u);
  assert.equal(body.includes('- Branch:'), false);
});

test('empty notes are a failure, never a silently empty release', () => {
  assert.throws(
    () =>
      composeReleaseNotes({
        version: '1.8.0',
        notes: '   \n  ',
        buildVersion: '1.8.0-1',
        commit: 'abc1234',
      }),
    /empty/u,
  );
});
