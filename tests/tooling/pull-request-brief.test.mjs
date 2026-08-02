import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BRIEF_END,
  BRIEF_START,
  buildPullRequestBody,
  extractHighlights,
} from '../../tools/release/pull-request-brief.mjs';

const NOTES = `# FoodOrderV1 v1.8.0

Summary line.

## Highlights

- First thing that changed.
- Second thing that changed.

## Validation

- Everything passed.
`;

test('highlights come from the release notes, not a second summary', () => {
  assert.deepEqual(extractHighlights(NOTES), [
    '- First thing that changed.',
    '- Second thing that changed.',
  ]);
  assert.deepEqual(extractHighlights('# No highlights here\n'), []);
});

test('an empty pull request gets the whole brief', () => {
  const body = buildPullRequestBody({ version: '1.8.0', notes: NOTES });

  assert.match(body, /## v1\.8\.0/u);
  assert.match(body, /- First thing that changed\./u);
  assert.match(body, /release-notes\/v1\.8\.0\.md/u);
  assert.equal(body.includes(BRIEF_START), true);
  assert.equal(body.includes(BRIEF_END), true);
});

test('text the author wrote is never overwritten', () => {
  const authored = 'Reviewers: please check the migration path first.';
  const first = buildPullRequestBody({
    version: '1.8.0',
    notes: NOTES,
    existingBody: authored,
  });
  assert.match(first, /Reviewers: please check the migration path first\./u);

  // A later push refreshes only the managed block.
  const refreshedNotes = NOTES.replace(
    '- Second thing that changed.',
    '- Second thing, now reworded.',
  );
  const second = buildPullRequestBody({
    version: '1.8.0',
    notes: refreshedNotes,
    existingBody: first,
  });

  assert.match(second, /Reviewers: please check the migration path first\./u);
  assert.match(second, /- Second thing, now reworded\./u);
  assert.equal(second.includes('- Second thing that changed.'), false);
  // Exactly one managed block, however many times it is refreshed.
  assert.equal(second.split(BRIEF_START).length - 1, 1);
  assert.equal(second.split(BRIEF_END).length - 1, 1);
});

test('the build link appears once the prerelease exists', () => {
  const withoutArtifact = buildPullRequestBody({
    version: '1.8.0',
    notes: NOTES,
  });
  assert.match(withoutArtifact, /publishes the APK once every gate passes/u);

  const withArtifact = buildPullRequestBody({
    version: '1.8.0',
    notes: NOTES,
    artifact: {
      version: '1.8.0-dev.254',
      url: 'https://example.test/releases/v1.8.0-dev.254',
    },
  });
  assert.match(withArtifact, /1\.8\.0-dev\.254/u);
  assert.match(withArtifact, /debug APK attached/u);
});
