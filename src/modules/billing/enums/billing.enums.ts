export const BILLING_PLAN = {
  free: 'free',
  organizerPro: 'organizer_pro',
  businessWorkspace: 'business_workspace',
} as const;

export type BillingPlan =
  (typeof BILLING_PLAN)[keyof typeof BILLING_PLAN];

export const SUBSCRIPTION_STATUS = {
  inactive: 'inactive',
  trialing: 'trialing',
  active: 'active',
  grace: 'grace',
  cancelAtPeriodEnd: 'cancel_at_period_end',
  pastDue: 'past_due',
  cancelled: 'cancelled',
} as const;

export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const ENTITLEMENT = {
  coreGroupOrdering: 'core_group_ordering',
  recurringSessions: 'recurring_sessions',
  automatedReminders: 'automated_reminders',
  paymentTracking: 'payment_tracking',
  paymentProof: 'payment_proof',
  receiptReconciliation: 'receipt_reconciliation',
  advancedExports: 'advanced_exports',
  extendedHistory: 'extended_history',
  workspaces: 'workspaces',
  workspaceAdministration: 'workspace_administration',
  costCenters: 'cost_centers',
  spendingPolicies: 'spending_policies',
  workspaceBranding: 'workspace_branding',
} as const;

export type Entitlement =
  (typeof ENTITLEMENT)[keyof typeof ENTITLEMENT];

export const USAGE_METER = {
  activeSessions: 'active_sessions',
  recurringSchedules: 'recurring_schedules',
  workspaceMembers: 'workspace_members',
  menuTemplates: 'menu_templates',
  attachmentStorageBytes: 'attachment_storage_bytes',
  automatedRemindersPerMonth: 'automated_reminders_per_month',
  advancedExportsPerMonth: 'advanced_exports_per_month',
  historyRetentionDays: 'history_retention_days',
} as const;

export type UsageMeter =
  (typeof USAGE_METER)[keyof typeof USAGE_METER];

export const ENTITLEMENT_DECISION = {
  allowed: 'allowed',
  upgradeRequired: 'upgrade_required',
  limitReached: 'limit_reached',
  subscriptionInactive: 'subscription_inactive',
} as const;

export type EntitlementDecision =
  (typeof ENTITLEMENT_DECISION)[keyof typeof ENTITLEMENT_DECISION];
