import type {
  PaymentStatus,
  SettlementAllocationStrategy,
} from '../enums';
import type { CurrencyCode } from './domain.types';

export interface ParticipantSettlement {
  sessionId: string;
  userId: string;
  currency: CurrencyCode;
  expectedTotalMinor: number;
  adjustmentMinor: number;
  reconciledTotalMinor: number;
  paidMinor: number;
  outstandingMinor: number;
  status: PaymentStatus;
  proofAttachmentId: string | null;
  declaredAt: string | null;
  proofSubmittedAt: string | null;
  verifiedAt: string | null;
  rejectedAt: string | null;
  waivedAt: string | null;
  refundedAt: string | null;
  statusActorId: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantSettlementDraft {
  sessionId: string;
  userId: string;
  currency: CurrencyCode;
  expectedTotalMinor: number;
  createdAt?: string;
}

export interface SettlementParticipantInput {
  userId: string;
  expectedTotalMinor: number;
}

export interface SettlementReconciliationInput {
  currency: CurrencyCode;
  expectedGrandTotalMinor: number;
  actualGrandTotalMinor: number;
  strategy: SettlementAllocationStrategy;
  participants: SettlementParticipantInput[];
  manualAdjustmentsMinor?: Record<string, number>;
  confirmedBy: string;
  confirmedAt?: string;
  revision: number;
}

export interface SettlementParticipantAdjustment {
  userId: string;
  expectedTotalMinor: number;
  adjustmentMinor: number;
  reconciledTotalMinor: number;
}

export interface SettlementReconciliationSnapshot {
  currency: CurrencyCode;
  expectedGrandTotalMinor: number;
  actualGrandTotalMinor: number;
  differenceMinor: number;
  strategy: SettlementAllocationStrategy;
  participantAdjustments: SettlementParticipantAdjustment[];
  confirmedBy: string;
  confirmedAt: string;
  revision: number;
}

export interface SettlementStatusSummary {
  participantCount: number;
  expectedGrandTotalMinor: number;
  reconciledGrandTotalMinor: number;
  paidGrandTotalMinor: number;
  outstandingGrandTotalMinor: number;
  verifiedGrandTotalMinor: number;
  unpaidCount: number;
  declaredPaidCount: number;
  proofSubmittedCount: number;
  verifiedCount: number;
  rejectedCount: number;
  waivedCount: number;
  refundedCount: number;
}
