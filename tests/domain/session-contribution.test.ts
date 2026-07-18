import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PRICING_POLICY,
  applySessionContributionMutation,
  calculateSessionExpectedGrandTotalMinor,
  computeSessionAggregate,
  createSessionMenuSnapshot,
  validateSessionMenuItems,
  validateSessionPricingPolicy,
  type Bucket,
  type SessionContribution,
  type SessionMenuItemSnapshot,
} from '@/modules/data-access';

const occurredAt = '2026-07-18T09:00:00.000Z';

const contribution = (
  userId: string,
  quantities: Record<string, number>,
): SessionContribution => ({
  sessionId: 'session-1',
  userId,
  displayName: `User ${userId}`,
  quantities,
  revision: 1,
  lastMutationId: `mutation-${userId}`,
  updatedAt: occurredAt,
});

const sessionMenuItems = (): SessionMenuItemSnapshot[] => [
  {
    id: 'meal',
    name: 'Meal',
    description: '',
    category: 'Main',
    unitPriceMinor: 10_000,
    active: true,
    sortOrder: 0,
    createdByUserId: null,
    createdByName: null,
    source: 'catalog',
  },
  {
    id: 'drink',
    name: 'Drink',
    description: '',
    category: 'Drinks',
    unitPriceMinor: 2_500,
    active: true,
    sortOrder: 1,
    createdByUserId: null,
    createdByName: null,
    source: 'catalog',
  },
];

describe('session contribution mutations', () => {
  it('creates a first absolute quantity mutation', () => {
    expect(
      applySessionContributionMutation(
        { contribution: null, appliedMutation: null },
        {
          mutationId: 'mutation-1',
          sessionId: 'session-1',
          userId: 'user-1',
          displayName: 'User One',
          itemId: 'meal',
          operation: 'set',
          value: 2,
          occurredAt,
        },
      ),
    ).toEqual({
      contribution: {
        sessionId: 'session-1',
        userId: 'user-1',
        displayName: 'User One',
        quantities: { meal: 2 },
        revision: 1,
        lastMutationId: 'mutation-1',
        updatedAt: occurredAt,
      },
      record: {
        id: 'mutation-1',
        sessionId: 'session-1',
        userId: 'user-1',
        itemId: 'meal',
        operation: 'set',
        requestedValue: 2,
        appliedDelta: 2,
        resultQuantity: 2,
        resultRevision: 1,
        createdAt: occurredAt,
      },
      alreadyApplied: false,
    });
  });

  it('increments, replaces, and removes quantities immutably', () => {
    const current = contribution('user-1', { meal: 2, drink: 1 });
    const incremented = applySessionContributionMutation(
      { contribution: current, appliedMutation: null },
      {
        mutationId: 'mutation-2',
        sessionId: 'session-1',
        userId: 'user-1',
        displayName: 'User One',
        itemId: 'meal',
        operation: 'increment',
        value: 3,
        occurredAt,
      },
    );
    const removed = applySessionContributionMutation(
      { contribution: incremented.contribution, appliedMutation: null },
      {
        mutationId: 'mutation-3',
        sessionId: 'session-1',
        userId: 'user-1',
        displayName: 'User One',
        itemId: 'drink',
        operation: 'set',
        value: 0,
        occurredAt,
      },
    );

    expect(incremented.contribution.quantities).toEqual({ meal: 5, drink: 1 });
    expect(incremented.record.appliedDelta).toBe(3);
    expect(removed.contribution.quantities).toEqual({ meal: 5 });
    expect(current.quantities).toEqual({ meal: 2, drink: 1 });
  });

  it('returns an already-recorded mutation without applying it twice', () => {
    const current = contribution('user-1', { meal: 2 });
    const record = {
      id: 'mutation-1',
      sessionId: 'session-1',
      userId: 'user-1',
      itemId: 'meal',
      operation: 'increment' as const,
      requestedValue: 1,
      appliedDelta: 1,
      resultQuantity: 2,
      resultRevision: 1,
      createdAt: occurredAt,
    };

    expect(
      applySessionContributionMutation(
        { contribution: current, appliedMutation: record },
        {
          mutationId: 'mutation-1',
          sessionId: 'session-1',
          userId: 'user-1',
          displayName: 'User One',
          itemId: 'meal',
          operation: 'increment',
          value: 1,
          occurredAt,
        },
      ),
    ).toEqual({ contribution: current, record, alreadyApplied: true });
    expect(() =>
      applySessionContributionMutation(
        { contribution: null, appliedMutation: record },
        {
          mutationId: 'mutation-1',
          sessionId: 'session-1',
          userId: 'user-1',
          displayName: 'User One',
          itemId: 'meal',
          operation: 'increment',
          value: 1,
          occurredAt,
        },
      ),
    ).toThrow(/without a session contribution/);
  });

  it('rejects invalid identity, time, and quantity values', () => {
    const input = {
      mutationId: 'mutation-1',
      sessionId: 'session-1',
      userId: 'user-1',
      displayName: 'User One',
      itemId: 'meal',
      operation: 'set' as const,
      value: 1,
      occurredAt,
    };

    expect(() =>
      applySessionContributionMutation(
        { contribution: null, appliedMutation: null },
        { ...input, occurredAt: 'invalid' },
      ),
    ).toThrow(/Contribution time/);
    expect(() =>
      applySessionContributionMutation(
        { contribution: null, appliedMutation: null },
        { ...input, mutationId: ' ' },
      ),
    ).toThrow(/required/);
    expect(() =>
      applySessionContributionMutation(
        { contribution: null, appliedMutation: null },
        { ...input, value: -1 },
      ),
    ).toThrow(/Quantity/);
    expect(() =>
      applySessionContributionMutation(
        { contribution: null, appliedMutation: null },
        { ...input, value: 1.5 },
      ),
    ).toThrow(/Quantity/);
    expect(() =>
      applySessionContributionMutation(
        { contribution: null, appliedMutation: null },
        { ...input, value: 1_000 },
      ),
    ).toThrow(/Quantity/);
  });
});

describe('session aggregate and totals', () => {
  it('aggregates positive quantities across participants', () => {
    expect(
      computeSessionAggregate([
        contribution('user-1', { meal: 2, drink: 1 }),
        contribution('user-2', { meal: 1, drink: 0 }),
      ]),
    ).toEqual({ meal: 3, drink: 1 });
  });

  it('calculates VAT, service, and delivery in minor units', () => {
    expect(
      calculateSessionExpectedGrandTotalMinor(
        {
          menuItems: sessionMenuItems(),
          pricingPolicy: {
            ...DEFAULT_PRICING_POLICY,
            vatBasisPoints: 1_400,
            serviceBasisPoints: 1_200,
            deliveryMinor: 2_000,
          },
        },
        { meal: 2, drink: 1 },
      ),
    ).toBe(30_350);
  });

  it('rejects malformed aggregate values and unsafe totals', () => {
    expect(() =>
      calculateSessionExpectedGrandTotalMinor(
        {
          menuItems: sessionMenuItems(),
          pricingPolicy: DEFAULT_PRICING_POLICY,
        },
        { meal: -1 },
      ),
    ).toThrow(/Aggregate quantity/);
    expect(() =>
      calculateSessionExpectedGrandTotalMinor(
        {
          menuItems: [
            {
              ...sessionMenuItems()[0]!,
              unitPriceMinor: Number.MAX_SAFE_INTEGER,
            },
          ],
          pricingPolicy: DEFAULT_PRICING_POLICY,
        },
        { meal: 2 },
      ),
    ).toThrow(/Line total/);
  });
});

describe('session menu snapshots', () => {
  it('converts legacy major-unit bucket pricing once and excludes pending items', () => {
    const bucket: Bucket = {
      id: 'bucket-1',
      ownerId: 'owner-1',
      ownerName: 'Owner',
      title: 'Menu',
      description: '',
      currency: 'EGP',
      visibility: 'shared',
      status: 'active',
      orderState: 'open',
      customItemMode: 'proposal',
      pricingPolicy: DEFAULT_PRICING_POLICY,
      schemaVersion: 3,
      revision: 2,
      aggregate: {},
      items: [
        {
          id: 'approved',
          name: 'Approved',
          description: '',
          category: '',
          unitPrice: 99.995,
          active: true,
          sortOrder: 1,
          source: 'custom',
          approvalStatus: 'approved',
        },
        {
          id: 'pending',
          name: 'Pending',
          description: '',
          category: '',
          unitPrice: 10,
          active: true,
          sortOrder: 0,
          source: 'custom',
          approvalStatus: 'pending',
        },
      ],
      createdAt: occurredAt,
      updatedAt: occurredAt,
    };

    expect(createSessionMenuSnapshot(bucket)).toEqual({
      menuItems: [
        {
          id: 'pending',
          name: 'Pending',
          description: '',
          category: '',
          unitPriceMinor: 1_000,
          active: false,
          sortOrder: 0,
          createdByUserId: null,
          createdByName: null,
          source: 'custom',
        },
        {
          id: 'approved',
          name: 'Approved',
          description: '',
          category: '',
          unitPriceMinor: 10_000,
          active: true,
          sortOrder: 1,
          createdByUserId: null,
          createdByName: null,
          source: 'custom',
        },
      ],
      pricingPolicy: DEFAULT_PRICING_POLICY,
    });
  });

  it('validates item count, uniqueness, fields, money, and pricing policy', () => {
    expect(() => validateSessionMenuItems([])).toThrow(/at least one/);
    expect(() =>
      validateSessionMenuItems(Array.from({ length: 51 }, (_, index) => ({
        ...sessionMenuItems()[0]!,
        id: `item-${index}`,
        sortOrder: index,
      }))),
    ).toThrow(/at most 50/);
    expect(() =>
      validateSessionMenuItems([
        sessionMenuItems()[0]!,
        { ...sessionMenuItems()[1]!, id: 'meal' },
      ]),
    ).toThrow(/unique/);
    expect(() =>
      validateSessionMenuItems([{ ...sessionMenuItems()[0]!, name: ' ' }]),
    ).toThrow(/name/);
    expect(() =>
      validateSessionMenuItems([
        { ...sessionMenuItems()[0]!, unitPriceMinor: -1 },
      ]),
    ).toThrow(/unit price/);
    expect(() =>
      validateSessionPricingPolicy({
        ...DEFAULT_PRICING_POLICY,
        vatBasisPoints: 10_001,
      }),
    ).toThrow(/VAT/);
    expect(() =>
      validateSessionPricingPolicy({
        ...DEFAULT_PRICING_POLICY,
        deliveryMinor: 1.5,
      }),
    ).toThrow(/Delivery/);
  });
});
