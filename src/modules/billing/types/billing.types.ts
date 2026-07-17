import type {
  BillingPlan,
  Entitlement,
  EntitlementDecision,
  SubscriptionStatus,
  UsageMeter,
} from '../enums/billing.enums';

export type UsageLimit = number | null;

export interface BillingPlanDefinition {
  id: BillingPlan;
  entitlements: readonly Entitlement[];
  usageLimits: Readonly<Record<UsageMeter, UsageLimit>>;
}

export interface SubscriptionRecord {
  ownerId: string;
  workspaceId: string | null;
  plan: BillingPlan;
  status: SubscriptionStatus;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStartedAt: string | null;
  currentPeriodEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  graceEndsAt: string | null;
  providerCustomerReference: string | null;
  providerSubscriptionReference: string | null;
  providerStateRevision: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface EntitlementSnapshot {
  ownerId: string;
  workspaceId: string | null;
  plan: BillingPlan;
  subscriptionStatus: SubscriptionStatus;
  entitlements: readonly Entitlement[];
  usageLimits: Readonly<Record<UsageMeter, UsageLimit>>;
  effectiveAt: string;
  sourceRevision: number;
}

export interface UsageSnapshot {
  values: Readonly<Partial<Record<UsageMeter, number>>>;
  measuredAt: string;
}

export interface EntitlementEvaluation {
  entitlement: Entitlement;
  decision: EntitlementDecision;
  plan: BillingPlan;
  subscriptionStatus: SubscriptionStatus;
  meter: UsageMeter | null;
  used: number | null;
  limit: UsageLimit;
  remaining: UsageLimit;
}
