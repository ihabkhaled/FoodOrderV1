import { describe, expect, it } from 'vitest';

import type { Order } from '@/modules/data-access';
import { buildRepeatedOrderDraft, getOrderChargeBreakdown } from '@/modules/data-access';

const order: Order = {
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
    {
      id: 'line-2',
      bucketItemId: 'item-2',
      name: 'Ta3mya',
      quantity: 3,
      unitPrice: 5,
      lineTotal: 15,
    },
  ],
  notes: '',
  subtotal: 35,
  total: 69.1,
  sourceBucketRevision: 4,
  participants: [
    {
      userId: 'owner-1',
      displayName: 'Owner',
      quantities: { 'item-1': 2, 'item-2': 3 },
    },
  ],
  groupReceipt: {
    currency: 'EGP',
    itemSubtotalMinor: 3500,
    vatMinor: 490,
    serviceMinor: 420,
    deliveryMinor: 2500,
    grandTotalMinor: 6910,
    participantReceipts: [
      {
        userId: 'owner-1',
        displayName: 'Owner',
        lines: [],
        itemSubtotalMinor: 3500,
        vatShareMinor: 490,
        serviceShareMinor: 420,
        deliveryShareMinor: 2500,
        totalMinor: 6910,
      },
    ],
    items: [],
    pricingPolicy: {
      vatBasisPoints: 1400,
      serviceBasisPoints: 1200,
      deliveryMinor: 2500,
      vatAllocation: 'proportional',
      serviceAllocation: 'proportional',
      deliveryAllocation: 'equal',
    },
    bucketRevision: 4,
  },
  createdAt: '2026-07-15T00:00:00.000Z',
  updatedAt: '2026-07-15T00:00:00.000Z',
  placedAt: '2026-07-15T00:00:00.000Z',
  completedAt: null,
  cancelledAt: null,
};

describe('repeated order snapshots', () => {
  it('keeps the exact name and complete pricing configuration', () => {
    const draft = buildRepeatedOrderDraft(order);

    expect(draft.bucketTitle).toBe('Bashandy');
    expect(draft.bucketTitle).not.toContain('(copy)');
    expect(draft.groupReceipt).toEqual(order.groupReceipt);
    expect(draft.groupReceipt).not.toBe(order.groupReceipt);
    expect(draft.groupReceipt?.pricingPolicy).toEqual(
      order.groupReceipt?.pricingPolicy,
    );
  });

  it('returns the owner VAT, service, and delivery totals', () => {
    expect(getOrderChargeBreakdown(order)).toEqual({
      vat: 4.9,
      service: 4.2,
      delivery: 25,
    });
  });

  it('returns allocated charges for a participant copy', () => {
    const participantOrder: Order = {
      ...order,
      userId: 'editor-1',
      subtotal: 15,
      total: 23.9,
      groupReceipt: {
        ...order.groupReceipt!,
        participantReceipts: [
          {
            userId: 'editor-1',
            displayName: 'Editor',
            lines: [],
            itemSubtotalMinor: 1500,
            vatShareMinor: 210,
            serviceShareMinor: 180,
            deliveryShareMinor: 500,
            totalMinor: 2390,
          },
        ],
      },
    };

    expect(getOrderChargeBreakdown(participantOrder)).toEqual({
      vat: 2.1,
      service: 1.8,
      delivery: 5,
    });
  });
});
