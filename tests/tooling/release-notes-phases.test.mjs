import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const notesPath = `release-notes/v${version}.md`;
const notes = readFileSync(notesPath, 'utf8');

/**
 * Release notes are written as each phase lands, never afterwards from the
 * diff: a diff cannot remember the reasoning, the rejected alternative, or the
 * defect found on the way. These assertions keep the file honest enough to be
 * generated straight into the pull request description.
 */
test('the notes carry a phase table', () => {
  assert.ok(notes.includes('## Phases'), `${notesPath} has no phase table`);
  assert.match(notes, /\|\s*Phase\s*\|.*Evidence\s*\|/u);
});

test('every phase in the table has a matching entry or is marked pending', () => {
  const rows = [...notes.matchAll(/^\|\s*([A-F])\s*\|([^|]*)\|([^|]*)\|/gmu)];
  assert.ok(rows.length > 0, 'no phase rows found');
  for (const [, phase, , evidence] of rows) {
    const pending = evidence.trim().toLowerCase() === 'pending';
    const hasEntry = notes.includes(`### Phase ${phase}`);
    assert.ok(
      pending || hasEntry,
      `phase ${phase} claims evidence but has no "### Phase ${phase}" entry`,
    );
  }
});

test('a completed phase states what it left out and what it fixed', () => {
  const completed = [...notes.matchAll(/^\|\s*([A-F])\s*\|[^|]*\|\s*(?!pending)([^|]+)\|/gmu)];
  if (completed.length === 0) return;
  assert.ok(notes.includes('## Fixed'), 'completed phases must record what they fixed');
  assert.ok(
    notes.includes('## Not done in this release'),
    'completed phases must name what was deliberately left out',
  );
});
