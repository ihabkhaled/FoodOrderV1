import assert from 'node:assert/strict';
import test from 'node:test';

import {
  friendRequestId,
  mergeAccessSources,
  normalizeEmail,
  strongestRole,
} from '../lib/functions/src/socialDomain.js';

test('normalizes exact email lookup values', () => {
  assert.equal(normalizeEmail('  User@Example.COM '), 'user@example.com');
  assert.throws(() => normalizeEmail('not-an-email'));
});

test('keeps the strongest role when direct and group grants overlap', () => {
  assert.equal(strongestRole('viewer', 'contributor'), 'contributor');
  assert.equal(strongestRole('editor', 'viewer'), 'editor');
});

test('preserves independent access sources without duplicates', () => {
  assert.deepEqual(
    mergeAccessSources(['group_company', 'user_alice'], 'group_company'),
    ['group_company', 'user_alice'],
  );
});

test('friend request mirrors use one deterministic identity', () => {
  assert.equal(friendRequestId('sender', 'recipient'), 'sender_recipient');
});
