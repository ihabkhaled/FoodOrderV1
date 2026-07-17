import { describe, expect, it } from 'vitest';

import {
  BILLING_PLAN,
  BILLING_PLAN_CATALOG,
  ENTITLEMENT,
  ENTITLEMENT_DECISION,
  SUBSCRIPTION_STATUS,
  USAGE_METER,
  assertEntitlement,
  createEntitlementSnapshot,
  effectiveBillingPlan,
  evaluateEntitlement,
  hasEntitlement,
  subscriptionProvidesPaidAccess,
  type SubscriptionRecord,
} from '@/modules/billing';

const effectiveAt = '2026-07-18T13:00:00.000Z';

const subscription = (
  plan: SubscriptionRecord['plan'],
  status: SubscriptionRecord['status'],
  revision = 3,
): SubscriptionRecord => ({
  ownerId: 'owner-1',
  workspaceId: null,
  plan,
  status,
  trialStartedAt: null,
  trialEndsAt: null,
  currentPeriodStartedAt: '2026-07-01T00:00:00.000Z',
  currentPeriodEndsAt: '2026-08-01T00:00:00.000Z',
  cancelAtPeriodEnd: status === SUBSCRIPTION_STATUS.cancelAtPeriodEnd,
  graceEndsAt:
    status === SUBSCRIPTION_STATUS.grace
      ? '2026-08-08T00:00:00.000Z'
      : null,
  providerCustomerReference: 'private-customer-reference',
  providerSubscriptionReference: 'private-subscription-reference',
  providerStateRevision: 8,
  revision,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: effectiveAt,
});

describe('billing plan catalog', () => {
  it('defines bounded free and organizer plans plus business unlimited meters', () => {
    expect(BILLING_PLAN_CATALOG.free.entitlements).toEqual([
      ENTITLEMENT.coreGroupOrdering,
    ]);
    expect(
      BILLING_PLAN_CATALOG.organizer_pro.entitlements,
    ).toContain(ENTITLEMENT.receiptReconciliation);
    expect(
      BILLING_PLAN_CATALOG.business_workspace.entitlements,
    ).toEqual(Object.values(ENTITLEMENT));
    expect(
      BILLING_PLAN_CATALOG.free.usageLimits[USAGE_METER.activeSessions],
    ).toBe(2);
    expect(
      BILLING_PLAN_CATALOG.organizer_pro.usageLimits[
        USAGE_METER.attachmentStorageBytes
      ],
    ).toBe(500 * 1024 * 1024);
    expect(
      BILLING_PLAN_CATALOG.business_workspace.usageLimits[
        USAGE_METER.activeSessions
      ],
    ).toBeNull();
  });
});

describe('effective subscription access', () => {
  it.each([
    SUBSCRIPTION_STATUS.trialing,
    SUBSCRIPTION_STATUS.active,
    SUBSCRIPTION_STATUS.grace,
    SUBSCRIPTION_STATUS.cancelAtPeriodEnd,
  ])('keeps paid access while status is %s', (status) => {
    expect(subscriptionProvidesPaidAccess(status)).toBe(true);
    expect(
      effectiveBillingPlan(subscription(BILLING_PLAN.organizerPro, status)),
    ).toBe(BILLING_PLAN.organizerPro);
  });

  it.each([
    SUBSCRIPTION_STATUS.inactive,
    SUBSCRIPTION_STATUS.pastDue,
    SUBSCRIPTION_STATUS.cancelled,
  ])('falls back to free when paid subscription is %s', (status) => {
    expect(subscriptionProvidesPaidAccess(status)).toBe(false);
    expect(
      effectiveBillingPlan(
        subscription(BILLING_PLAN.businessWorkspace, status),
      ),
    ).toBe(BILLING_PLAN.free);
  });

  it('keeps explicit free records and missing subscriptions on free', () => {
    expect(effectiveBillingPlan(null)).toBe(BILLING_PLAN.free);
    expect(
      effectiveBillingPlan(
        subscription(BILLING_PLAN.free, SUBSCRIPTION_STATUS.active),
      ),
    ).toBe(BILLING_PLAN.free);
  });
});

describe('entitlement snapshots', () => {
  it('creates a privacy-safe free snapshot without provider references', () => {
    expect(
      createEntitlementSnapshot(' owner-1 ', ' ', null, effectiveAt),
    ).toEqual({
      ownerId: 'owner-1',
      workspaceId: null,
      plan: BILLING_PLAN.free,
      subscriptionStatus: SUBSCRIPTION_STATUS.inactive,
      entitlements: [ENTITLEMENT.coreGroupOrdering],
      usageLimits: BILLING_PLAN_CATALOG.free.usageLimits,
      effectiveAt,
      sourceRevision: 0,
    });
  });

  it('copies trusted paid policy and revision into the snapshot', () => {
    const record = subscription(
      BILLING_PLAN.organizerPro,
      SUBSCRIPTION_STATUS.active,
      9,
    );
    const snapshot = createEntitlementSnapshot(
      'owner-1',
      ' workspace-1 ',
      record,
      effectiveAt,
    );

    expect(snapshot).toMatchObject({
      ownerId: 'owner-1',
      workspaceId: 'workspace-1',
      plan: BILLING_PLAN.organizerPro,
      subscriptionStatus: SUBSCRIPTION_STATUS.active,
      sourceRevision: 9,
    });
    expect(snapshot.entitlements).not.toBe(
      BILLING_PLAN_CATALOG.organizer_pro.entitlements,
    );
    expect(snapshot.usageLimits).not.toBe(
      BILLING_PLAN_CATALOG.organizer_pro.usageLimits,
    );
  });

  it('rejects invalid owner, effective time, and revision', () => {
    expect(() => createEntitlementSnapshot('', null, null, effectiveAt)).toThrow(
      /owner ID/,
    );
    expect(() => createEntitlementSnapshot('owner-1', null, null, 'invalid')).toThrow(
      /effective time/,
    );
    expect(() =>
      createEntitlementSnapshot(
        'owner-1',
        null,
        subscription(BILLING_PLAN.organizerPro, SUBSCRIPTION_STATUS.active, -1),
        effectiveAt,
      ),
    ).toThrow(/revision/);
  });
});

describe('entitlement evaluation', () => {
  it('allows a non-metered paid entitlement', () => {
    const snapshot = createEntitlementSnapshot(
      'owner-1',
      null,
      subscription(BILLING_PLAN.organizerPro, SUBSCRIPTION_STATUS.active),
      effectiveAt,
    );

    expect(hasEntitlement(snapshot, ENTITLEMENT.receiptReconciliation)).toBe(true);
    expect(
      evaluateEntitlement(snapshot, ENTITLEMENT.receiptReconciliation),
    ).toEqual({
      entitlement: ENTITLEMENT.receiptReconciliation,
      decision: ENTITLEMENT_DECISION.allowed,
      plan: BILLING_PLAN.organizerPro,
      subscriptionStatus: SUBSCRIPTION_STATUS.active,
      meter: null,
      used: null,
      limit: null,
      remaining: null,
    });
  });

  it('returns upgrade required for a missing free entitlement', () => {
    const snapshot = createEntitlementSnapshot('owner-1', null, null, effectiveAt);

    expect(hasEntitlement(snapshot, ENTITLEMENT.recurringSessions)).toBe(false);
    expect(
      evaluateEntitlement(snapshot, ENTITLEMENT.recurringSessions, {
        values: { [USAGE_METER.recurringSchedules]: 0 },
        measuredAt: effectiveAt,
      }),
    ).toMatchObject({
      decision: ENTITLEMENT_DECISION.upgradeRequired,
      meter: USAGE_METER.recurringSchedules,
      used: 0,
      limit: 0,
      remaining: 0,
    });
  });

  it('returns subscription inactive for a paid snapshot missing an entitlement', () => {
    const paidSnapshot = createEntitlementSnapshot(
      'owner-1',
      null,
      subscription(BILLING_PLAN.organizerPro, SUBSCRIPTION_STATUS.active),
      effectiveAt,
    );
    const modified = {
      ...paidSnapshot,
      entitlements: paidSnapshot.entitlements.filter(
        (item) => item !== ENTITLEMENT.receiptReconciliation,
      ),
    };

    expect(
      evaluateEntitlement(modified, ENTITLEMENT.receiptReconciliation),
    ).toMatchObject({
      decision: ENTITLEMENT_DECISION.subscriptionInactive,
      meter: null,
      used: null,
    });
  });

  it('allows metered usage below the plan limit', () => {
    const snapshot = createEntitlementSnapshot(
      'owner-1',
      null,
      subscription(BILLING_PLAN.organizerPro, SUBSCRIPTION_STATUS.active),
      effectiveAt,
    );

    expect(
      evaluateEntitlement(snapshot, ENTITLEMENT.recurringSessions, {
        values: { [USAGE_METER.recurringSchedules]: 4 },
        measuredAt: effectiveAt,
      }),
    ).toMatchObject({
      decision: ENTITLEMENT_DECISION.allowed,
      used: 4,
      limit: 10,
      remaining: 6,
    });
  });

  it('blocks metered usage at or above the plan limit', () => {
    const snapshot = createEntitlementSnapshot(
      'owner-1',
      null,
      subscription(BILLING_PLAN.organizerPro, SUBSCRIPTION_STATUS.active),
      effectiveAt,
    );

    expect(
      evaluateEntitlement(snapshot, ENTITLEMENT.recurringSessions, {
        values: { [USAGE_METER.recurringSchedules]: 10 },
        measuredAt: effectiveAt,
      }).decision,
    ).toBe(ENTITLEMENT_DECISION.limitReached);
    expect(
      evaluateEntitlement(snapshot, ENTITLEMENT.recurringSessions, {
        values: { [USAGE_METER.recurringSchedules]: 12 },
        measuredAt: effectiveAt,
      }).remaining,
    ).toBe(0);
  });

  it('keeps unlimited business usage allowed', () => {
    const snapshot = createEntitlementSnapshot(
      'owner-1',
      'workspace-1',
      subscription(
        BILLING_PLAN.businessWorkspace,
        SUBSCRIPTION_STATUS.active,
      ),
      effectiveAt,
    );

    expect(
      evaluateEntitlement(snapshot, ENTITLEMENT.coreGroupOrdering, {
        values: { [USAGE_METER.activeSessions]: 100_000 },
        measuredAt: effectiveAt,
      }),
    ).toMatchObject({
      decision: ENTITLEMENT_DECISION.allowed,
      limit: null,
      remaining: null,
    });
  });

  it('treats missing usage as zero and rejects invalid usage', () => {
    const snapshot = createEntitlementSnapshot('owner-1', null, null, effectiveAt);

    expect(
      evaluateEntitlement(snapshot, ENTITLEMENT.coreGroupOrdering),
    ).toMatchObject({ used: 0, remaining: 2 });
    expect(() =>
      evaluateEntitlement(snapshot, ENTITLEMENT.coreGroupOrdering, {
        values: { [USAGE_METER.activeSessions]: -1 },
        measuredAt: effectiveAt,
      }),
    ).toThrow(/non-negative/);
    expect(() =>
      evaluateEntitlement(snapshot, ENTITLEMENT.coreGroupOrdering, {
        values: { [USAGE_METER.activeSessions]: 1.5 },
        measuredAt: effectiveAt,
      }),
    ).toThrow(/non-negative/);
  });

  it('returns the evaluation or throws for assertion callers', () => {
    const snapshot = createEntitlementSnapshot('owner-1', null, null, effectiveAt);

    expect(
      assertEntitlement(snapshot, ENTITLEMENT.coreGroupOrdering),
    ).toMatchObject({ decision: ENTITLEMENT_DECISION.allowed });
    expect(() =>
      assertEntitlement(snapshot, ENTITLEMENT.recurringSessions),
    ).toThrow(/upgrade_required/);
  });
});
