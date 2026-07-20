import {
  BILLING_PLAN_CATALOG,
  ENTITLEMENT_USAGE_METER,
} from '../constants/billing-plans.constants';
import {
  BILLING_PLAN,
  type BillingPlan,
  type Entitlement,
  ENTITLEMENT_DECISION,
  SUBSCRIPTION_STATUS,
  type SubscriptionStatus,
  type UsageMeter,
} from '../enums/billing.enums';
import type {
  EntitlementEvaluation,
  EntitlementSnapshot,
  SubscriptionRecord,
  UsageLimit,
  UsageSnapshot,
} from '../types/billing.types';

const PAID_ACCESS_STATUSES = new Set<SubscriptionStatus>([
  SUBSCRIPTION_STATUS.trialing,
  SUBSCRIPTION_STATUS.active,
  SUBSCRIPTION_STATUS.grace,
  SUBSCRIPTION_STATUS.cancelAtPeriodEnd,
]);

const assertIsoTimestamp = (value: string, label: string): string => {
  if (Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${label} must be a valid ISO timestamp.`);
  }
  return value;
};

const assertRevision = (value: number): number => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('Subscription revision must be a non-negative safe integer.');
  }
  return value;
};

const normalizedUsage = (
  usage: UsageSnapshot | undefined,
  meter: UsageMeter,
): number => {
  const value = usage?.values[meter] ?? 0;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Usage for ${meter} must be a non-negative safe integer.`);
  }
  return value;
};

const remainingFrom = (limit: UsageLimit, used: number): UsageLimit =>
  limit === null ? null : Math.max(0, limit - used);

export const subscriptionProvidesPaidAccess = (
  status: SubscriptionStatus,
): boolean => PAID_ACCESS_STATUSES.has(status);

export const effectiveBillingPlan = (
  subscription: SubscriptionRecord | null,
): BillingPlan => {
  if (!subscription) return BILLING_PLAN.free;
  if (subscription.plan === BILLING_PLAN.free) return BILLING_PLAN.free;
  return subscriptionProvidesPaidAccess(subscription.status)
    ? subscription.plan
    : BILLING_PLAN.free;
};

export const createEntitlementSnapshot = (
  ownerId: string,
  workspaceId: string | null,
  subscription: SubscriptionRecord | null,
  effectiveAt: string,
): EntitlementSnapshot => {
  const normalizedOwnerId = ownerId.trim();
  if (!normalizedOwnerId) throw new Error('Entitlement owner ID is required.');
  assertIsoTimestamp(effectiveAt, 'Entitlement effective time');

  const plan = effectiveBillingPlan(subscription);
  const definition = BILLING_PLAN_CATALOG[plan];
  return {
    ownerId: normalizedOwnerId,
    workspaceId: workspaceId?.trim() || null,
    plan,
    subscriptionStatus:
      subscription?.status ?? SUBSCRIPTION_STATUS.inactive,
    entitlements: [...definition.entitlements],
    usageLimits: { ...definition.usageLimits },
    effectiveAt,
    sourceRevision: assertRevision(subscription?.revision ?? 0),
  };
};

export const hasEntitlement = (
  snapshot: EntitlementSnapshot,
  entitlement: Entitlement,
): boolean => snapshot.entitlements.includes(entitlement);

export const evaluateEntitlement = (
  snapshot: EntitlementSnapshot,
  entitlement: Entitlement,
  usage?: UsageSnapshot,
): EntitlementEvaluation => {
  const meter = ENTITLEMENT_USAGE_METER[entitlement];
  const limit = meter ? snapshot.usageLimits[meter] : null;

  if (!hasEntitlement(snapshot, entitlement)) {
    return {
      entitlement,
      decision:
        snapshot.plan === BILLING_PLAN.free
          ? ENTITLEMENT_DECISION.upgradeRequired
          : ENTITLEMENT_DECISION.subscriptionInactive,
      plan: snapshot.plan,
      subscriptionStatus: snapshot.subscriptionStatus,
      meter,
      used: meter ? normalizedUsage(usage, meter) : null,
      limit,
      remaining: limit,
    };
  }

  if (!meter) {
    return {
      entitlement,
      decision: ENTITLEMENT_DECISION.allowed,
      plan: snapshot.plan,
      subscriptionStatus: snapshot.subscriptionStatus,
      meter: null,
      used: null,
      limit: null,
      remaining: null,
    };
  }

  const used = normalizedUsage(usage, meter);
  const remaining = remainingFrom(limit, used);
  const isLimitReached = limit !== null && used >= limit;
  return {
    entitlement,
    decision: isLimitReached
      ? ENTITLEMENT_DECISION.limitReached
      : ENTITLEMENT_DECISION.allowed,
    plan: snapshot.plan,
    subscriptionStatus: snapshot.subscriptionStatus,
    meter,
    used,
    limit,
    remaining,
  };
};

export const assertEntitlement = (
  snapshot: EntitlementSnapshot,
  entitlement: Entitlement,
  usage?: UsageSnapshot,
): EntitlementEvaluation => {
  const evaluation = evaluateEntitlement(snapshot, entitlement, usage);
  if (evaluation.decision !== ENTITLEMENT_DECISION.allowed) {
    throw new Error(
      `Entitlement ${entitlement} is not available: ${evaluation.decision}.`,
    );
  }
  return evaluation;
};
