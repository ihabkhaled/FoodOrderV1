import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canInviteGroupMember,
  friendRequestId,
  mergeAccessSources,
  normalizeEmail,
  removeAccessSource,
  strongestRole,
  strongestRoleFromGrants,
} from '../lib/functions/src/socialDomain.js';

test('normalizes exact email lookup values', () => {
  assert.equal(normalizeEmail('  User@Example.COM '), 'user@example.com');
  assert.throws(() => normalizeEmail('not-an-email'));
});

test('keeps the strongest role when direct and group grants overlap', () => {
  assert.equal(strongestRole('viewer', 'contributor'), 'contributor');
  assert.equal(strongestRole('editor', 'viewer'), 'editor');
  assert.equal(
    strongestRoleFromGrants(['viewer', 'editor', 'contributor']),
    'editor',
  );
  assert.equal(strongestRoleFromGrants([]), null);
});

test('preserves independent access sources without duplicates', () => {
  assert.deepEqual(
    mergeAccessSources(['group_company', 'user_alice'], 'group_company'),
    ['group_company', 'user_alice'],
  );
  assert.deepEqual(
    removeAccessSource(['group_company', 'user_alice'], 'group_company'),
    ['user_alice'],
  );
});

test('blocks duplicate group invitations until membership has ended', () => {
  assert.equal(canInviteGroupMember('active'), false);
  assert.equal(canInviteGroupMember('pending'), false);
  assert.equal(canInviteGroupMember('declined'), true);
  assert.equal(canInviteGroupMember('removed'), true);
  assert.equal(canInviteGroupMember('left'), true);
  assert.equal(canInviteGroupMember(undefined), true);
});

test('friend request mirrors use one deterministic identity', () => {
  assert.equal(friendRequestId('sender', 'recipient'), 'sender_recipient');
});
