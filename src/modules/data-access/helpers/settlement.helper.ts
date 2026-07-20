import { nowIso } from '@/shared/helpers';

import {
  PAYMENT_STATUS,
  type PaymentStatus,
  SETTLEMENT_ALLOCATION_STRATEGY,
} from '../enums';
import type {
  ParticipantSettlement,
  ParticipantSettlementDraft,
  SettlementReconciliationInput,
  SettlementReconciliationSnapshot,
  SettlementStatusSummary,
} from '../types/settlement.types';
import { allocateMinorUnits } from './group-order.helper';

const PAYMENT_STATUS_TRANSITIONS: Readonly<
  Record<PaymentStatus, readonly PaymentStatus[]>
> = {
  unpaid: [
    PAYMENT_STATUS.declaredPaid,
    PAYMENT_STATUS.proofSubmitted,
    PAYMENT_STATUS.waived,
  ],
  declared_paid: [
    PAYMENT_STATUS.unpaid,
    PAYMENT_STATUS.proofSubmitted,
    PAYMENT_STATUS.verified,
    PAYMENT_STATUS.rejected,
  ],
  proof_submitted: [PAYMENT_STATUS.verified, PAYMENT_STATUS.rejected],
  verified: [PAYMENT_STATUS.refunded],
  rejected: [
    PAYMENT_STATUS.unpaid,
    PAYMENT_STATUS.declaredPaid,
    PAYMENT_STATUS.proofSubmitted,
    PAYMENT_STATUS.waived,
  ],
  waived: [PAYMENT_STATUS.refunded],
  refunded: [],
};

const assertRequiredText = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};

const assertIsoTimestamp = (value: string, label: string): string => {
  if (Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${label} must be a valid ISO timestamp.`);
  }
  return value;
};

const assertMinorUnits = (
  value: number,
  label: string,
  allowNegative = false,
): number => {
  if (!Number.isSafeInteger(value) || (!allowNegative && value < 0)) {
    throw new Error(
      `${label} must be ${allowNegative ? 'a safe integer' : 'a non-negative safe integer'}.`,
    );
  }
  return value;
};

export const createParticipantSettlement = (
  draft: ParticipantSettlementDraft,
): ParticipantSettlement => {
  const createdAt = assertIsoTimestamp(draft.createdAt ?? nowIso(), 'Created time');
  const expectedTotalMinor = assertMinorUnits(
    draft.expectedTotalMinor,
    'Expected total',
  );

  return {
    sessionId: assertRequiredText(draft.sessionId, 'Session ID'),
    userId: assertRequiredText(draft.userId, 'Participant ID'),
    currency: draft.currency,
    expectedTotalMinor,
    adjustmentMinor: 0,
    reconciledTotalMinor: expectedTotalMinor,
    paidMinor: 0,
    outstandingMinor: expectedTotalMinor,
    status: PAYMENT_STATUS.unpaid,
    proofAttachmentId: null,
    declaredAt: null,
    proofSubmittedAt: null,
    verifiedAt: null,
    rejectedAt: null,
    waivedAt: null,
    refundedAt: null,
    statusActorId: null,
    revision: 1,
    createdAt,
    updatedAt: createdAt,
  };
};

export const canTransitionPaymentStatus = (
  currentStatus: PaymentStatus,
  nextStatus: PaymentStatus,
): boolean =>
  currentStatus === nextStatus ||
  PAYMENT_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);

const settlementAmountsForStatus = (
  settlement: ParticipantSettlement,
  nextStatus: PaymentStatus,
): Pick<ParticipantSettlement, 'outstandingMinor' | 'paidMinor'> => {
  if (nextStatus === PAYMENT_STATUS.verified || nextStatus === PAYMENT_STATUS.waived) {
    return { paidMinor: settlement.reconciledTotalMinor, outstandingMinor: 0 };
  }
  if (nextStatus === PAYMENT_STATUS.refunded) {
    return { paidMinor: 0, outstandingMinor: settlement.reconciledTotalMinor };
  }
  return {
    paidMinor: settlement.paidMinor,
    outstandingMinor: settlement.outstandingMinor,
  };
};

const settlementTimestampPatch = (
  nextStatus: PaymentStatus,
  at: string,
): Partial<ParticipantSettlement> => {
  switch (nextStatus) {
    case PAYMENT_STATUS.declaredPaid:
      return { declaredAt: at };
    case PAYMENT_STATUS.proofSubmitted:
      return { proofSubmittedAt: at };
    case PAYMENT_STATUS.verified:
      return { verifiedAt: at };
    case PAYMENT_STATUS.rejected:
      return { rejectedAt: at };
    case PAYMENT_STATUS.waived:
      return { waivedAt: at };
    case PAYMENT_STATUS.refunded:
      return { refundedAt: at };
    case PAYMENT_STATUS.unpaid:
      return {};
  }
};

export const transitionParticipantPaymentStatus = (
  settlement: ParticipantSettlement,
  nextStatus: PaymentStatus,
  actorId: string,
  at: string = nowIso(),
  proofAttachmentId?: string,
): ParticipantSettlement => {
  if (settlement.status === nextStatus) return settlement;
  const normalizedActorId = assertRequiredText(actorId, 'Payment status actor');
  assertIsoTimestamp(at, 'Payment status time');

  if (!canTransitionPaymentStatus(settlement.status, nextStatus)) {
    throw new Error(
      `Payment status cannot transition from ${settlement.status} to ${nextStatus}.`,
    );
  }

  const normalizedProofId = proofAttachmentId?.trim() || null;
  if (nextStatus === PAYMENT_STATUS.proofSubmitted && !normalizedProofId) {
    throw new Error('A payment proof attachment is required.');
  }

  const amounts = settlementAmountsForStatus(settlement, nextStatus);
  return {
    ...settlement,
    ...amounts,
    ...settlementTimestampPatch(nextStatus, at),
    status: nextStatus,
    proofAttachmentId: normalizedProofId ?? settlement.proofAttachmentId,
    statusActorId: normalizedActorId,
    revision: settlement.revision + 1,
    updatedAt: at,
  };
};

const buildAutomaticAdjustments = (
  input: SettlementReconciliationInput,
  differenceMinor: number,
): Record<string, number> => {
  const allocated = allocateMinorUnits(
    Math.abs(differenceMinor),
    input.participants.map((participant) => ({
      id: participant.userId,
      weight:
        input.strategy === SETTLEMENT_ALLOCATION_STRATEGY.equal
          ? 1
          : participant.expectedTotalMinor,
    })),
  );
  const sign = differenceMinor < 0 ? -1 : 1;

  return Object.fromEntries(
    Object.entries(allocated).map(([userId, amount]) => [userId, amount * sign]),
  );
};

const buildManualAdjustments = (
  input: SettlementReconciliationInput,
  differenceMinor: number,
): Record<string, number> => {
  const supplied = input.manualAdjustmentsMinor ?? {};
  const participantIds = new Set(input.participants.map((participant) => participant.userId));

  for (const userId of Object.keys(supplied)) {
    if (!participantIds.has(userId)) {
      throw new Error(`Manual adjustment references unknown participant ${userId}.`);
    }
  }

  const adjustments = Object.fromEntries(
    input.participants.map((participant) => [
      participant.userId,
      assertMinorUnits(
        supplied[participant.userId] ?? 0,
        'Manual adjustment',
        true,
      ),
    ]),
  );
  const total = Object.values(adjustments).reduce((sum, value) => sum + value, 0);
  if (total !== differenceMinor) {
    throw new Error(
      `Manual adjustments must total the receipt difference of ${differenceMinor}.`,
    );
  }

  return adjustments;
};

export const buildSettlementReconciliation = (
  input: SettlementReconciliationInput,
): SettlementReconciliationSnapshot => {
  const expectedGrandTotalMinor = assertMinorUnits(
    input.expectedGrandTotalMinor,
    'Expected grand total',
  );
  const actualGrandTotalMinor = assertMinorUnits(
    input.actualGrandTotalMinor,
    'Actual grand total',
  );
  if (!Number.isInteger(input.revision) || input.revision < 1) {
    throw new Error('Reconciliation revision must be a positive integer.');
  }
  const confirmedBy = assertRequiredText(input.confirmedBy, 'Confirmation actor');
  const confirmedAt = assertIsoTimestamp(
    input.confirmedAt ?? nowIso(),
    'Confirmation time',
  );
  if (input.participants.length === 0) {
    throw new Error('Reconciliation requires at least one participant.');
  }

  const participantIds = new Set<string>();
  let participantExpectedTotal = 0;
  for (const participant of input.participants) {
    const userId = assertRequiredText(participant.userId, 'Participant ID');
    if (participantIds.has(userId)) {
      throw new Error('Reconciliation participant identifiers must be unique.');
    }
    participantIds.add(userId);
    participantExpectedTotal += assertMinorUnits(
      participant.expectedTotalMinor,
      'Participant expected total',
    );
  }
  if (participantExpectedTotal !== expectedGrandTotalMinor) {
    throw new Error('Participant expected totals must equal the expected grand total.');
  }

  const differenceMinor = actualGrandTotalMinor - expectedGrandTotalMinor;
  const adjustments =
    input.strategy === SETTLEMENT_ALLOCATION_STRATEGY.manual
      ? buildManualAdjustments(input, differenceMinor)
      : buildAutomaticAdjustments(input, differenceMinor);

  const participantAdjustments = input.participants
    .map((participant) => {
      const adjustmentMinor = adjustments[participant.userId] ?? 0;
      const reconciledTotalMinor = participant.expectedTotalMinor + adjustmentMinor;
      if (reconciledTotalMinor < 0) {
        throw new Error('A reconciliation cannot make a participant total negative.');
      }
      return {
        userId: participant.userId,
        expectedTotalMinor: participant.expectedTotalMinor,
        adjustmentMinor,
        reconciledTotalMinor,
      };
    })
    .toSorted((left, right) => left.userId.localeCompare(right.userId));

  const reconciledGrandTotal = participantAdjustments.reduce(
    (sum, participant) => sum + participant.reconciledTotalMinor,
    0,
  );
  if (reconciledGrandTotal !== actualGrandTotalMinor) {
    throw new Error('Reconciliation did not resolve to the actual grand total.');
  }

  return {
    currency: input.currency,
    expectedGrandTotalMinor,
    actualGrandTotalMinor,
    differenceMinor,
    strategy: input.strategy,
    participantAdjustments,
    confirmedBy,
    confirmedAt,
    revision: input.revision,
  };
};

export const applySettlementReconciliation = (
  settlement: ParticipantSettlement,
  snapshot: SettlementReconciliationSnapshot,
): ParticipantSettlement => {
  if (settlement.currency !== snapshot.currency) {
    throw new Error('Settlement and reconciliation currencies must match.');
  }
  const adjustment = snapshot.participantAdjustments.find(
    (candidate) => candidate.userId === settlement.userId,
  );
  if (!adjustment) {
    throw new Error('The reconciliation has no adjustment for this participant.');
  }
  if (adjustment.expectedTotalMinor !== settlement.expectedTotalMinor) {
    throw new Error('The reconciliation expected total does not match the settlement.');
  }

  const paidMinor = Math.min(settlement.paidMinor, adjustment.reconciledTotalMinor);
  return {
    ...settlement,
    adjustmentMinor: adjustment.adjustmentMinor,
    reconciledTotalMinor: adjustment.reconciledTotalMinor,
    paidMinor,
    outstandingMinor: adjustment.reconciledTotalMinor - paidMinor,
    revision: settlement.revision + 1,
    updatedAt: snapshot.confirmedAt,
  };
};

const PAYMENT_STATUS_COUNT_KEY = {
  [PAYMENT_STATUS.unpaid]: 'unpaidCount',
  [PAYMENT_STATUS.declaredPaid]: 'declaredPaidCount',
  [PAYMENT_STATUS.proofSubmitted]: 'proofSubmittedCount',
  [PAYMENT_STATUS.verified]: 'verifiedCount',
  [PAYMENT_STATUS.rejected]: 'rejectedCount',
  [PAYMENT_STATUS.waived]: 'waivedCount',
  [PAYMENT_STATUS.refunded]: 'refundedCount',
} as const satisfies Record<
  PaymentStatus,
  | 'unpaidCount'
  | 'declaredPaidCount'
  | 'proofSubmittedCount'
  | 'verifiedCount'
  | 'rejectedCount'
  | 'waivedCount'
  | 'refundedCount'
>;

export const summarizeSettlements = (
  settlements: ParticipantSettlement[],
): SettlementStatusSummary => {
  const summary: SettlementStatusSummary = {
    participantCount: 0,
    expectedGrandTotalMinor: 0,
    reconciledGrandTotalMinor: 0,
    paidGrandTotalMinor: 0,
    outstandingGrandTotalMinor: 0,
    verifiedGrandTotalMinor: 0,
    unpaidCount: 0,
    declaredPaidCount: 0,
    proofSubmittedCount: 0,
    verifiedCount: 0,
    rejectedCount: 0,
    waivedCount: 0,
    refundedCount: 0,
  };

  for (const settlement of settlements) {
    summary.participantCount += 1;
    summary.expectedGrandTotalMinor += settlement.expectedTotalMinor;
    summary.reconciledGrandTotalMinor += settlement.reconciledTotalMinor;
    summary.paidGrandTotalMinor += settlement.paidMinor;
    summary.outstandingGrandTotalMinor += settlement.outstandingMinor;
    if (settlement.status === PAYMENT_STATUS.verified) {
      summary.verifiedGrandTotalMinor += settlement.paidMinor;
    }

    const statusCountKey = PAYMENT_STATUS_COUNT_KEY[settlement.status];
    summary[statusCountKey] += 1;
  }

  return summary;
};
