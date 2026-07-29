import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isAccessOnlyBucketUpdate,
  isJoinCodeInviteAcceptance,
} from '../lib/functions/src/notificationDomain.js';

test('suppresses generic notifications only for access-only bucket updates', () => {
  const before = {
    title: 'Lunch',
    visibility: 'private',
    revision: 1,
  };
  const accessOnly = {
    ...before,
    visibility: 'shared',
    revision: 2,
    lastSocialAccessChangeAt: '2026-07-16T12:00:00.000Z',
  };
  assert.equal(isAccessOnlyBucketUpdate(before, accessOnly), true);
  assert.equal(
    isAccessOnlyBucketUpdate(before, { ...accessOnly, title: 'Dinner' }),
    false,
  );
  assert.equal(
    isAccessOnlyBucketUpdate(before, { ...before, revision: 2 }),
    false,
  );
});

test('recognizes only complete pending-to-accepted join-code transitions', () => {
  const pending = { status: 'pending', createdBy: 'owner' };
  const accepted = {
    status: 'accepted',
    createdBy: 'owner',
    acceptedBy: 'recipient',
  };
  assert.equal(isJoinCodeInviteAcceptance(pending, accepted), true);
  assert.equal(isJoinCodeInviteAcceptance(accepted, accepted), false);
  assert.equal(
    isJoinCodeInviteAcceptance(pending, { ...accepted, acceptedBy: null }),
    false,
  );
});

test('the order-session round callable is exported with its fan-out helper', async () => {
  // entry.js initializes the admin app before the session module loads.
  const entry = await import('../lib/functions/src/entry.js');
  assert.equal(typeof entry.createOrderSessionV170, 'function');

  // The fan-out helper the callable now depends on must stay exported.
  const core = await import('../lib/functions/src/notificationCore.js');
  assert.equal(typeof core.writeNotifications, 'function');
});
