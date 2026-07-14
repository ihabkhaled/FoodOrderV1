import { describe, expect, it } from 'vitest';

import {
  allocateMinorUnits,
  calculateBasisPointCharge,
  calculateGroupOrderReceipt,
  type GroupOrderParticipantInput,
} from '@/lib/groupOrder';

const participant = (
  userId: string,
  itemId: string,
  quantity: number,
  unitPriceMinor: number,
  createdByUserId = 'owner',
): GroupOrderParticipantInput => ({
  userId,
  displayName: userId.toUpperCase(),
  items: [
    {
      itemId,
      itemName: `Item ${itemId}`,
      quantity,
      unitPriceMinor,
      createdByUserId,
      createdByName: createdByUserId.toUpperCase(),
    },
  ],
});

const policy = {
  vatBasisPoints: 1000,
  serviceBasisPoints: 500,
  deliveryMinor: 301,
  vatAllocation: 'proportional' as const,
  serviceAllocation: 'proportional' as const,
  deliveryAllocation: 'equal' as const,
};

describe('group-order financial engine', () => {
  it('calculates percentage charges using exact integer rounding', () => {
    expect(calculateBasisPointCharge(6000, 1000)).toBe(600);
    expect(calculateBasisPointCharge(5, 1000)).toBe(1);
    expect(calculateBasisPointCharge(4, 1000)).toBe(0);
  });

  it('allocates every minor unit deterministically with stable residual ordering', () => {
    expect(
      allocateMinorUnits(301, [
        { id: 'charlie', weight: 1 },
        { id: 'alice', weight: 1 },
        { id: 'bob', weight: 1 },
      ]),
    ).toEqual({ charlie: 100, alice: 101, bob: 100 });
  });

  it('falls back to an equal split when all proportional weights are zero', () => {
    expect(
      allocateMinorUnits(2, [
        { id: 'b', weight: 0 },
        { id: 'a', weight: 0 },
        { id: 'c', weight: 0 },
      ]),
    ).toEqual({ b: 1, a: 1, c: 0 });
  });

  it('creates immutable per-person totals that reconcile to the master receipt', () => {
    const receipt = calculateGroupOrderReceipt({
      currency: 'EGP',
      participants: [
        participant('alice', 'foul', 1, 1000),
        participant('bob', 'falafel', 1, 2000),
        participant('charlie', 'tea', 1, 3000),
      ],
      policy,
    });

    expect(receipt).toMatchObject({
      itemSubtotalMinor: 6000,
      vatMinor: 600,
      serviceMinor: 300,
      deliveryMinor: 301,
      grandTotalMinor: 7201,
    });
    expect(receipt.participantReceipts).toEqual([
      expect.objectContaining({
        userId: 'alice',
        itemSubtotalMinor: 1000,
        vatShareMinor: 100,
        serviceShareMinor: 50,
        deliveryShareMinor: 101,
        totalMinor: 1251,
      }),
      expect.objectContaining({
        userId: 'bob',
        itemSubtotalMinor: 2000,
        vatShareMinor: 200,
        serviceShareMinor: 100,
        deliveryShareMinor: 100,
        totalMinor: 2400,
      }),
      expect.objectContaining({
        userId: 'charlie',
        itemSubtotalMinor: 3000,
        vatShareMinor: 300,
        serviceShareMinor: 150,
        deliveryShareMinor: 100,
        totalMinor: 3550,
      }),
    ]);
    expect(
      receipt.participantReceipts.reduce((sum, participantReceipt) => {
        return sum + participantReceipt.totalMinor;
      }, 0),
    ).toBe(receipt.grandTotalMinor);
  });

  it('supports zero VAT, service, and delivery charges', () => {
    const receipt = calculateGroupOrderReceipt({
      currency: 'USD',
      participants: [participant('alice', 'meal', 2, 1250)],
      policy: {
        ...policy,
        vatBasisPoints: 0,
        serviceBasisPoints: 0,
        deliveryMinor: 0,
      },
    });

    expect(receipt.grandTotalMinor).toBe(2500);
    expect(receipt.participantReceipts[0]).toMatchObject({
      vatShareMinor: 0,
      serviceShareMinor: 0,
      deliveryShareMinor: 0,
      totalMinor: 2500,
    });
  });

  it('classifies each item by creator and every person who ordered it', () => {
    const receipt = calculateGroupOrderReceipt({
      currency: 'EUR',
      participants: [
        participant('alice', 'custom', 2, 500, 'bob'),
        participant('bob', 'custom', 3, 500, 'bob'),
      ],
      policy: { ...policy, vatBasisPoints: 0, serviceBasisPoints: 0, deliveryMinor: 0 },
    });

    expect(receipt.items).toEqual([
      {
        itemId: 'custom',
        itemName: 'Item custom',
        createdByUserId: 'bob',
        createdByName: 'BOB',
        totalQuantity: 5,
        orderedBy: [
          { userId: 'alice', displayName: 'ALICE', quantity: 2 },
          { userId: 'bob', displayName: 'BOB', quantity: 3 },
        ],
      },
    ]);
  });

  it('includes explicitly listed zero-subtotal participants in equal shared charges', () => {
    const receipt = calculateGroupOrderReceipt({
      currency: 'GBP',
      participants: [participant('alice', 'meal', 1, 1000), { userId: 'bob', displayName: 'BOB', items: [] }],
      policy: {
        ...policy,
        vatBasisPoints: 0,
        serviceBasisPoints: 0,
        deliveryMinor: 101,
      },
    });

    expect(receipt.participantReceipts.map(({ userId, deliveryShareMinor }) => ({ userId, deliveryShareMinor }))).toEqual([
      { userId: 'alice', deliveryShareMinor: 51 },
      { userId: 'bob', deliveryShareMinor: 50 },
    ]);
  });

  it('rejects invalid recipients, amounts, and conflicting item snapshots', () => {
    expect(() => allocateMinorUnits(1, [])).toThrow(/requires at least one/);
    expect(() => allocateMinorUnits(-1, [{ id: 'a', weight: 1 }])).toThrow(/non-negative/);
    expect(() => allocateMinorUnits(1, [{ id: 'a', weight: 1 }, { id: 'a', weight: 1 }])).toThrow(/unique/);
    expect(() => calculateGroupOrderReceipt({ currency: 'EGP', participants: [], policy })).toThrow(/participant/);
    expect(() =>
      calculateGroupOrderReceipt({
        currency: 'EGP',
        participants: [participant('same', 'a', 1, 1), participant('same', 'b', 1, 1)],
        policy,
      }),
    ).toThrow(/unique/);
    expect(() =>
      calculateGroupOrderReceipt({
        currency: 'EGP',
        participants: [
          participant('alice', 'shared', 1, 10, 'alice'),
          participant('bob', 'shared', 1, 10, 'bob'),
        ],
        policy,
      }),
    ).toThrow(/conflicting snapshots/);
  });
});
