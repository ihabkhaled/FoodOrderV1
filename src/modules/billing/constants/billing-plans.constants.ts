import {
  BILLING_PLAN,
  ENTITLEMENT,
  USAGE_METER,
} from '../enums/billing.enums';
import type { BillingPlanDefinition } from '../types/billing.types';

const megabytes = (value: number): number => value * 1024 * 1024;

export const BILLING_PLAN_CATALOG = {
  [BILLING_PLAN.free]: {
    id: BILLING_PLAN.free,
    entitlements: [ENTITLEMENT.coreGroupOrdering],
    usageLimits: {
      [USAGE_METER.activeSessions]: 2,
      [USAGE_METER.recurringSchedules]: 0,
      [USAGE_METER.workspaceMembers]: 0,
      [USAGE_METER.menuTemplates]: 5,
      [USAGE_METER.attachmentStorageBytes]: megabytes(10),
      [USAGE_METER.automatedRemindersPerMonth]: 0,
      [USAGE_METER.advancedExportsPerMonth]: 0,
      [USAGE_METER.historyRetentionDays]: 30,
    },
  },
  [BILLING_PLAN.organizerPro]: {
    id: BILLING_PLAN.organizerPro,
    entitlements: [
      ENTITLEMENT.coreGroupOrdering,
      ENTITLEMENT.recurringSessions,
      ENTITLEMENT.automatedReminders,
      ENTITLEMENT.paymentTracking,
      ENTITLEMENT.paymentProof,
      ENTITLEMENT.receiptReconciliation,
      ENTITLEMENT.advancedExports,
      ENTITLEMENT.extendedHistory,
    ],
    usageLimits: {
      [USAGE_METER.activeSessions]: 25,
      [USAGE_METER.recurringSchedules]: 10,
      [USAGE_METER.workspaceMembers]: 0,
      [USAGE_METER.menuTemplates]: 100,
      [USAGE_METER.attachmentStorageBytes]: megabytes(500),
      [USAGE_METER.automatedRemindersPerMonth]: 1_000,
      [USAGE_METER.advancedExportsPerMonth]: 100,
      [USAGE_METER.historyRetentionDays]: 730,
    },
  },
  [BILLING_PLAN.businessWorkspace]: {
    id: BILLING_PLAN.businessWorkspace,
    entitlements: Object.values(ENTITLEMENT),
    usageLimits: {
      [USAGE_METER.activeSessions]: null,
      [USAGE_METER.recurringSchedules]: null,
      [USAGE_METER.workspaceMembers]: 500,
      [USAGE_METER.menuTemplates]: null,
      [USAGE_METER.attachmentStorageBytes]: megabytes(10_000),
      [USAGE_METER.automatedRemindersPerMonth]: null,
      [USAGE_METER.advancedExportsPerMonth]: null,
      [USAGE_METER.historyRetentionDays]: null,
    },
  },
} as const satisfies Record<string, BillingPlanDefinition>;

export const ENTITLEMENT_USAGE_METER = {
  [ENTITLEMENT.coreGroupOrdering]: USAGE_METER.activeSessions,
  [ENTITLEMENT.recurringSessions]: USAGE_METER.recurringSchedules,
  [ENTITLEMENT.automatedReminders]: USAGE_METER.automatedRemindersPerMonth,
  [ENTITLEMENT.paymentTracking]: null,
  [ENTITLEMENT.paymentProof]: USAGE_METER.attachmentStorageBytes,
  [ENTITLEMENT.receiptReconciliation]: null,
  [ENTITLEMENT.advancedExports]: USAGE_METER.advancedExportsPerMonth,
  [ENTITLEMENT.extendedHistory]: USAGE_METER.historyRetentionDays,
  [ENTITLEMENT.workspaces]: USAGE_METER.workspaceMembers,
  [ENTITLEMENT.workspaceAdministration]: USAGE_METER.workspaceMembers,
  [ENTITLEMENT.costCenters]: null,
  [ENTITLEMENT.spendingPolicies]: null,
  [ENTITLEMENT.workspaceBranding]: null,
} as const;
