import type {
  OrderSessionStatus,
  ParticipantIdentityKind,
  ParticipantResponse,
  SessionParticipantRole,
} from '../enums';
import type {
  BucketPricingPolicy,
  ContributionOperation,
  CurrencyCode,
} from './domain.types';

export interface ParticipantResponseSummary {
  pending: number;
  viewed: number;
  ordering: number;
  done: number;
  skipped: number;
  removed: number;
  eligibleForFinalization: number;
  total: number;
}

export interface SessionSettlementSummary {
  participantCount: number;
  expectedGrandTotalMinor: number;
  outstandingGrandTotalMinor: number;
  verifiedGrandTotalMinor: number;
  settledParticipantCount: number;
}

export interface SessionMenuItemSnapshot {
  id: string;
  name: string;
  description: string;
  category: string;
  unitPriceMinor: number;
  active: boolean;
  sortOrder: number;
  createdByUserId: string | null;
  createdByName: string | null;
  source: 'catalog' | 'custom';
}

export interface OrderSession {
  id: string;
  menuTemplateId: string;
  sourceMenuRevision: number;
  organizerId: string;
  workspaceId: string | null;
  title: string;
  currency: CurrencyCode;
  timezone: string;
  status: OrderSessionStatus;
  deadlineAt: string | null;
  autoLock: boolean;
  scheduleOccurrenceKey: string | null;
  menuItems: SessionMenuItemSnapshot[];
  pricingPolicy: BucketPricingPolicy;
  aggregate: Record<string, number>;
  responseSummary: ParticipantResponseSummary;
  settlementSummary: SessionSettlementSummary;
  schemaVersion: number;
  revision: number;
  openedAt: string | null;
  lockedAt: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  deliveredAt: string | null;
  settlingAt: string | null;
  settledAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderSessionDraft {
  id: string;
  menuTemplateId: string;
  sourceMenuRevision: number;
  organizerId: string;
  workspaceId?: string | null;
  title: string;
  currency: CurrencyCode;
  timezone: string;
  deadlineAt?: string | null;
  autoLock?: boolean;
  scheduleOccurrenceKey?: string | null;
  menuItems: SessionMenuItemSnapshot[];
  pricingPolicy: BucketPricingPolicy;
  createdAt?: string;
}

export interface SessionParticipant {
  userId: string;
  displayName: string;
  identityKind: ParticipantIdentityKind;
  role: SessionParticipantRole;
  response: ParticipantResponse;
  includeInFinalOrder: boolean;
  firstViewedAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  removedAt: string | null;
  lastActivityAt: string;
  reminderCount: number;
  lastReminderAt: string | null;
  revision: number;
  joinedAt: string;
  updatedAt: string;
}

export interface SessionParticipantDraft {
  userId: string;
  displayName: string;
  identityKind: ParticipantIdentityKind;
  role: SessionParticipantRole;
  joinedAt?: string;
}

export interface SessionContribution {
  sessionId: string;
  userId: string;
  displayName: string;
  quantities: Readonly<Record<string, number>>;
  revision: number;
  lastMutationId: string;
  updatedAt: string;
}

export interface SessionContributionMutationInput {
  mutationId: string;
  sessionId: string;
  userId: string;
  displayName: string;
  itemId: string;
  operation: ContributionOperation;
  value: number;
  occurredAt: string;
}

export interface SessionContributionMutationRecord {
  id: string;
  sessionId: string;
  userId: string;
  itemId: string;
  operation: ContributionOperation;
  requestedValue: number;
  appliedDelta: number;
  resultQuantity: number;
  resultRevision: number;
  createdAt: string;
}

export interface OrderSessionView {
  session: OrderSession;
  participants: SessionParticipant[];
  contributions: SessionContribution[];
  currentParticipant: SessionParticipant | null;
}
