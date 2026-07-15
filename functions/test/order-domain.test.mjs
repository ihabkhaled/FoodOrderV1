import assert from 'node:assert/strict';
import test from 'node:test';

import {
  effectiveMemberCustomItemPermissions,
  memberCanPlaceGroupOrder,
} from '../lib/functions/src/memberPermissions.js';
import {
  buildOrderSnapshot,
} from '../lib/functions/src/orderDomain.js';

test('legacy editors receive custom-item permissions by default', () => {
  assert.deepEqual(
    effectiveMemberCustomItemPermissions({ role: 'editor' }),
    {
      canCreateCustomItems: true,
      canSetCustomItemPrice: true,
    },
  );
});

test('only active owners and editors may finalize a group order', () => {
  assert.equal(
    memberCanPlaceGroupOrder({ role: 'owner', status: 'active' }),
    true,
  );
  assert.equal(
    memberCanPlaceGroupOrder({ role: 'editor', status: 'active' }),
    true,
  );
  assert.equal(
    memberCanPlaceGroupOrder({ role: 'contributor', status: 'active' }),
    false,
  );
  assert.equal(
    memberCanPlaceGroupOrder({ role: 'editor', status: 'revoked' }),
    false,
  );
});

test('v1.3.2 callable entrypoint exports legacy and versioned endpoints', async () => {
  const functions = await import('../lib/functions/src/main.js');
  for (const name of [
    'finalizeGroupOrder',
    'finalizeGroupOrderV132',
    'addCustomBucketItem',
    'addCustomBucketItemV132',
    'approveCustomBucketItem',
    'approveCustomBucketItemV132',
  ]) {
    assert.equal(typeof functions[name], 'function', `${name} must be exported`);
  }
});

test('order finalization recovers from missing contribution documents using the aggregate', () => {
  const { order, aggregate } = buildOrderSnapshot(
    {
      id: 'bucket-1',
      ownerId: 'owner-1',
      ownerName: 'Owner',
      title: 'Lunch',
      currency: 'EGP',
      revision: 3,
      items: [
        {
          id: 'item-1',
          name: 'Falafel',
          unitPrice: 10,
          active: true,
          sortOrder: 0,
        },
      ],
      aggregate: { 'item-1': 2 },
    },
    [],
    'owner-1',
    '',
    'order-1',
    '2026-07-14T12:00:00.000Z',
  );

  assert.deepEqual(aggregate, { 'item-1': 2 });
  assert.equal(order.total, 20);
  assert.equal(order.lines[0]?.quantity, 2);
  assert.equal(order.groupReceipt.participantReceipts[0]?.userId, 'owner-1');
});

test('order finalization removes stale quantities and normalizes legacy metadata', () => {
  const { order, aggregate } = buildOrderSnapshot(
    {
      id: 'bucket-2',
      ownerId: 'owner-2',
      ownerName: '',
      title: '',
      currency: 'EGP',
      revision: 1,
      items: [
        {
          id: 'available',
          name: '',
          unitPrice: 5,
          active: true,
          sortOrder: 0,
        },
        {
          id: 'removed',
          name: 'Removed',
          unitPrice: 9,
          active: false,
          sortOrder: 1,
        },
      ],
      aggregate: { available: 1, removed: 4 },
      pricingPolicy: {
        vatBasisPoints: Number.NaN,
        deliveryMinor: -100,
      },
    },
    [
      {
        userId: 'owner-2',
        displayName: '',
        quantities: { available: 1, removed: 4 },
      },
    ],
    'owner-2',
    'note',
    'order-2',
    '2026-07-14T12:00:00.000Z',
  );

  assert.deepEqual(aggregate, { available: 1 });
  assert.equal(order.bucketTitle, 'Group order');
  assert.equal(order.lines.length, 1);
  assert.equal(order.total, 5);
});
