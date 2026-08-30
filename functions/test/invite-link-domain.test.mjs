import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INVITE_LINK_EXPIRY_HOURS,
  inviteLinkLimits,
  isInviteLinkUsable,
  parseInviteLinkToken,
  shareRoleOrDefault,
} from '../lib/functions/src/inviteLinkDomain.js';

test('accepts a generated token and rejects everything else', () => {
  assert.equal(parseInviteLinkToken('a'.repeat(32)), 'a'.repeat(32));
  assert.equal(parseInviteLinkToken(`  ${'b'.repeat(32)}  `), 'b'.repeat(32));

  // The token is the whole credential, so anything off-shape is refused before
  // it can be used as a document id.
  for (const invalid of [
    '',
    '   ',
    'a'.repeat(31),
    'a'.repeat(65),
    'A'.repeat(32),
    `${'a'.repeat(31)}/`,
    '../../admin',
    null,
    undefined,
    42,
    { toString: () => 'a'.repeat(32) },
  ]) {
    assert.equal(parseInviteLinkToken(invalid), null, `should reject ${String(invalid)}`);
  }
});

test('a link stays usable until it expires', () => {
  const link = { revoked: false, expiresAt: '2026-08-27T10:00:00.000Z' };
  assert.equal(isInviteLinkUsable(link, '2026-08-26T10:00:00.000Z'), true);
  assert.equal(isInviteLinkUsable(link, '2026-08-27T09:59:59.000Z'), true);
  assert.equal(isInviteLinkUsable(link, '2026-08-27T10:00:00.000Z'), false);
  assert.equal(isInviteLinkUsable(link, '2026-08-27T10:00:01.000Z'), false);
});

test('revocation beats a valid clock', () => {
  assert.equal(
    isInviteLinkUsable(
      { revoked: true, expiresAt: '2099-01-01T00:00:00.000Z' },
      '2026-08-26T10:00:00.000Z',
    ),
    false,
  );
});

test('bucket links last a week, friend and group links a day', () => {
  assert.equal(INVITE_LINK_EXPIRY_HOURS.bucket, 168);
  assert.equal(INVITE_LINK_EXPIRY_HOURS.friend, 24);
  assert.equal(INVITE_LINK_EXPIRY_HOURS.group, 24);
});

test('owner is never assignable through a link', () => {
  assert.equal(shareRoleOrDefault('editor'), 'editor');
  assert.equal(shareRoleOrDefault('viewer'), 'viewer');
  // Anything unrecognised — including an attempt at owner — falls back to the
  // least privileged useful role.
  assert.equal(shareRoleOrDefault('owner'), 'contributor');
  assert.equal(shareRoleOrDefault('admin'), 'contributor');
  assert.equal(shareRoleOrDefault(undefined), 'contributor');
});

test('live links per user per kind are capped', () => {
  assert.ok(inviteLinkLimits.perUserPerKind > 0);
  assert.ok(inviteLinkLimits.perUserPerKind <= 10);
});
