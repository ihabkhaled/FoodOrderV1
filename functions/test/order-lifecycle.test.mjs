import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGroupOrderTransitionPatch,
  repeatGroupOrderDocument,
} from '../lib/functions/src/orderLifecycle.js';

const source = {
  id: 'order-1',
  userId: 'owner-1',
  bucketId: 'bucket-1',
  bucketTitle: 'Bashandy',
  status: 'placed',
  currency: 'EGP',
  lines: [
    {
      id: 'line-1',
      bucketItemId: 'item-1',
      name: 'Fool',
      quantity: 2,
      unitPrice: 10,
      lineTotal: 20,
    },
  ],
  notes: '',
  subtotal: 35,
  total: 69.1,
  groupReceipt: {
    pricingPolicy: {
      vatBasisPoints: 1400,
      serviceBasisPoints: 1200,
      deliveryMinor: 2500,
      vatAllocation: 'proportional',
      serviceAllocation: 'proportional',
      deliveryAllocation: 'equal',
    },
    vatMinor: 490,
    serviceMinor: 420,
    deliveryMinor: 2500,
    grandTotalMinor: 6910,
    participantReceipts: [],
  },
  createdAt: '2026-07-15T00:00:00.000Z',
  updatedAt: '2026-07-15T00:00:00.000Z',
  placedAt: '2026-07-15T00:00:00.000Z',
  completedAt: null,
  cancelledAt: null,
};

test('repeating a group order preserves its exact name and pricing configuration', () => {
  const repeated = repeatGroupOrderDocument(
    source,
    'owner-1',
    'order-2',
    '2026-07-15T01:00:00.000Z',
  );

  assert.equal(repeated.bucketTitle, 'Bashandy');
  assert.equal(repeated.status, 'draft');
  assert.deepEqual(repeated.groupReceipt, source.groupReceipt);
  assert.notEqual(repeated.groupReceipt, source.groupReceipt);
  assert.equal(repeated.repeatedFromOrderId, 'order-1');
});

test('placed group orders may be completed or cancelled', () => {
  assert.deepEqual(
    buildGroupOrderTransitionPatch(
      'placed',
      'completed',
      '2026-07-15T01:00:00.000Z',
    ),
    {
      status: 'completed',
      updatedAt: '2026-07-15T01:00:00.000Z',
      completedAt: '2026-07-15T01:00:00.000Z',
    },
  );
  assert.throws(
    () =>
      buildGroupOrderTransitionPatch(
        'completed',
        'cancelled',
        '2026-07-15T01:00:00.000Z',
      ),
    /cannot move/u,
  );
});

test('v1.3.3 callable entrypoint exports repeat and transition endpoints', async () => {
  const functions = await import('../lib/functions/src/main.js');
  assert.equal(typeof functions.repeatGroupOrderV133, 'function');
  assert.equal(typeof functions.transitionGroupOrderV133, 'function');
});
