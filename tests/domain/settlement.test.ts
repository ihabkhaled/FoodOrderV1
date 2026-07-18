import { describe, expect, it } from 'vitest';

import {
  applySettlementReconciliation,
  buildSettlementReconciliation,
  canTransitionPaymentStatus,
  createParticipantSettlement,
  PAYMENT_STATUS,
  SETTLEMENT_ALLOCATION_STRATEGY,
  type SettlementParticipantInput,
  summarizeSettlements,
  transitionParticipantPaymentStatus,
} from '@/modules/data-access';

const createdAt = '2026-07-18T11:00:00.000Z';

const createSettlement = (userId = 'user-1', expectedTotalMinor = 10_000) =>
  createParticipantSettlement({
    sessionId: 'session-1',
    userId,
    currency: 'EGP',
    expectedTotalMinor,
    createdAt,
  });

const participants: [SettlementParticipantInput, SettlementParticipantInput] = [
  { userId: 'user-b', expectedTotalMinor: 3_000 },
  { userId: 'user-a', expectedTotalMinor: 7_000 },
];

describe('participant settlement lifecycle', () => {
  it('creates an unpaid minor-unit settlement', () => {
    expect(createSettlement()).toEqual({
      sessionId: 'session-1',
      userId: 'user-1',
      currency: 'EGP',
      expectedTotalMinor: 10_000,
      adjustmentMinor: 0,
      reconciledTotalMinor: 10_000,
      paidMinor: 0,
      outstandingMinor: 10_000,
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
    });
  });

  it('validates settlement identity, timestamp, and safe money', () => {
    expect(() =>
      createParticipantSettlement({ ...createSettlement(), sessionId: '' }),
    ).toThrow(/Session ID/);
    expect(() =>
      createParticipantSettlement({ ...createSettlement(), userId: '' }),
    ).toThrow(/Participant ID/);
    expect(() =>
      createParticipantSettlement({
        ...createSettlement(),
        expectedTotalMinor: -1,
      }),
    ).toThrow(/Expected total/);
    expect(() =>
      createParticipantSettlement({
        ...createSettlement(),
        expectedTotalMinor: 1.5,
      }),
    ).toThrow(/Expected total/);
    expect(() =>
      createParticipantSettlement({ ...createSettlement(), createdAt: 'invalid' }),
    ).toThrow(/Created time/);
  });

  it('tracks declaration, proof, verification, and refund', () => {
    const declared = transitionParticipantPaymentStatus(
      createSettlement(),
      PAYMENT_STATUS.declaredPaid,
      'user-1',
      '2026-07-18T11:05:00.000Z',
    );
    const proof = transitionParticipantPaymentStatus(
      declared,
      PAYMENT_STATUS.proofSubmitted,
      'user-1',
      '2026-07-18T11:06:00.000Z',
      'proof-1',
    );
    const verified = transitionParticipantPaymentStatus(
      proof,
      PAYMENT_STATUS.verified,
      'owner-1',
      '2026-07-18T11:10:00.000Z',
    );
    const refunded = transitionParticipantPaymentStatus(
      verified,
      PAYMENT_STATUS.refunded,
      'owner-1',
      '2026-07-18T11:20:00.000Z',
    );

    expect(declared).toMatchObject({
      status: PAYMENT_STATUS.declaredPaid,
      declaredAt: '2026-07-18T11:05:00.000Z',
      paidMinor: 0,
      outstandingMinor: 10_000,
    });
    expect(proof).toMatchObject({
      status: PAYMENT_STATUS.proofSubmitted,
      proofAttachmentId: 'proof-1',
      proofSubmittedAt: '2026-07-18T11:06:00.000Z',
    });
    expect(verified).toMatchObject({
      status: PAYMENT_STATUS.verified,
      verifiedAt: '2026-07-18T11:10:00.000Z',
      statusActorId: 'owner-1',
      paidMinor: 10_000,
      outstandingMinor: 0,
    });
    expect(refunded).toMatchObject({
      status: PAYMENT_STATUS.refunded,
      refundedAt: '2026-07-18T11:20:00.000Z',
      paidMinor: 0,
      outstandingMinor: 10_000,
    });
    expect(
      transitionParticipantPaymentStatus(
        refunded,
        PAYMENT_STATUS.refunded,
        'owner-1',
      ),
    ).toBe(refunded);
  });

  it('supports rejection, retry, reset, and waiver', () => {
    const proof = transitionParticipantPaymentStatus(
      createSettlement(),
      PAYMENT_STATUS.proofSubmitted,
      'user-1',
      createdAt,
      'proof-1',
    );
    const rejected = transitionParticipantPaymentStatus(
      proof,
      PAYMENT_STATUS.rejected,
      'owner-1',
      '2026-07-18T11:05:00.000Z',
    );
    const declared = transitionParticipantPaymentStatus(
      rejected,
      PAYMENT_STATUS.declaredPaid,
      'user-1',
      '2026-07-18T11:10:00.000Z',
    );
    const unpaid = transitionParticipantPaymentStatus(
      declared,
      PAYMENT_STATUS.unpaid,
      'user-1',
      '2026-07-18T11:11:00.000Z',
    );
    const waived = transitionParticipantPaymentStatus(
      unpaid,
      PAYMENT_STATUS.waived,
      'owner-1',
      '2026-07-18T11:15:00.000Z',
    );

    expect(rejected.rejectedAt).toBe('2026-07-18T11:05:00.000Z');
    expect(declared.status).toBe(PAYMENT_STATUS.declaredPaid);
    expect(unpaid.status).toBe(PAYMENT_STATUS.unpaid);
    expect(waived).toMatchObject({
      waivedAt: '2026-07-18T11:15:00.000Z',
      paidMinor: 10_000,
      outstandingMinor: 0,
    });
  });

  it('rejects invalid payment transitions and missing audit inputs', () => {
    expect(canTransitionPaymentStatus('unpaid', 'declared_paid')).toBe(true);
    expect(canTransitionPaymentStatus('unpaid', 'unpaid')).toBe(true);
    expect(canTransitionPaymentStatus('unpaid', 'verified')).toBe(false);
    expect(() =>
      transitionParticipantPaymentStatus(
        createSettlement(),
        PAYMENT_STATUS.proofSubmitted,
        'user-1',
        createdAt,
      ),
    ).toThrow(/proof attachment/);
    expect(() =>
      transitionParticipantPaymentStatus(
        createSettlement(),
        PAYMENT_STATUS.declaredPaid,
        '',
        createdAt,
      ),
    ).toThrow(/actor/);
    expect(() =>
      transitionParticipantPaymentStatus(
        createSettlement(),
        PAYMENT_STATUS.declaredPaid,
        'user-1',
        'invalid',
      ),
    ).toThrow(/status time/);
    expect(() =>
      transitionParticipantPaymentStatus(
        createSettlement(),
        PAYMENT_STATUS.verified,
        'owner-1',
        createdAt,
      ),
    ).toThrow(/cannot transition/);
  });
});

describe('settlement reconciliation', () => {
  it('allocates an odd positive difference equally and deterministically', () => {
    const snapshot = buildSettlementReconciliation({
      currency: 'EGP',
      expectedGrandTotalMinor: 10_000,
      actualGrandTotalMinor: 10_101,
      strategy: SETTLEMENT_ALLOCATION_STRATEGY.equal,
      participants,
      confirmedBy: 'owner-1',
      confirmedAt: '2026-07-18T12:00:00.000Z',
      revision: 1,
    });

    expect(snapshot.participantAdjustments).toEqual([
      {
        userId: 'user-a',
        expectedTotalMinor: 7_000,
        adjustmentMinor: 51,
        reconciledTotalMinor: 7_051,
      },
      {
        userId: 'user-b',
        expectedTotalMinor: 3_000,
        adjustmentMinor: 50,
        reconciledTotalMinor: 3_050,
      },
    ]);
    expect(snapshot).toMatchObject({
      differenceMinor: 101,
      confirmedBy: 'owner-1',
      confirmedAt: '2026-07-18T12:00:00.000Z',
      revision: 1,
    });
  });

  it('allocates positive and negative proportional differences', () => {
    const positive = buildSettlementReconciliation({
      currency: 'EGP',
      expectedGrandTotalMinor: 10_000,
      actualGrandTotalMinor: 11_000,
      strategy: SETTLEMENT_ALLOCATION_STRATEGY.proportional,
      participants,
      confirmedBy: 'owner-1',
      confirmedAt: createdAt,
      revision: 1,
    });
    const negative = buildSettlementReconciliation({
      currency: 'EGP',
      expectedGrandTotalMinor: 10_000,
      actualGrandTotalMinor: 9_000,
      strategy: SETTLEMENT_ALLOCATION_STRATEGY.proportional,
      participants,
      confirmedBy: 'owner-1',
      confirmedAt: createdAt,
      revision: 2,
    });

    expect(positive.participantAdjustments.map((item) => item.adjustmentMinor)).toEqual([
      700,
      300,
    ]);
    expect(negative.participantAdjustments.map((item) => item.adjustmentMinor)).toEqual([
      -700,
      -300,
    ]);
  });

  it('accepts exact manual adjustments and applies the snapshot', () => {
    const snapshot = buildSettlementReconciliation({
      currency: 'EGP',
      expectedGrandTotalMinor: 10_000,
      actualGrandTotalMinor: 10_250,
      strategy: SETTLEMENT_ALLOCATION_STRATEGY.manual,
      participants,
      manualAdjustmentsMinor: { 'user-a': 200, 'user-b': 50 },
      confirmedBy: 'owner-1',
      confirmedAt: '2026-07-18T12:00:00.000Z',
      revision: 3,
    });
    const paid = transitionParticipantPaymentStatus(
      createSettlement('user-a', 7_000),
      PAYMENT_STATUS.waived,
      'owner-1',
      '2026-07-18T11:30:00.000Z',
    );

    expect(applySettlementReconciliation(paid, snapshot)).toMatchObject({
      adjustmentMinor: 200,
      reconciledTotalMinor: 7_200,
      paidMinor: 7_000,
      outstandingMinor: 200,
      revision: 3,
      updatedAt: '2026-07-18T12:00:00.000Z',
    });
  });

  it('rejects invalid totals, identities, and manual allocation', () => {
    const valid = {
      currency: 'EGP' as const,
      expectedGrandTotalMinor: 10_000,
      actualGrandTotalMinor: 10_000,
      strategy: SETTLEMENT_ALLOCATION_STRATEGY.equal,
      participants,
      confirmedBy: 'owner-1',
      confirmedAt: createdAt,
      revision: 1,
    };

    expect(() =>
      buildSettlementReconciliation({ ...valid, expectedGrandTotalMinor: -1 }),
    ).toThrow(/Expected grand total/);
    expect(() =>
      buildSettlementReconciliation({ ...valid, actualGrandTotalMinor: 1.5 }),
    ).toThrow(/Actual grand total/);
    expect(() => buildSettlementReconciliation({ ...valid, revision: 0 })).toThrow(
      /revision/,
    );
    expect(() =>
      buildSettlementReconciliation({ ...valid, confirmedBy: '' }),
    ).toThrow(/Confirmation actor/);
    expect(() =>
      buildSettlementReconciliation({ ...valid, confirmedAt: 'invalid' }),
    ).toThrow(/Confirmation time/);
    expect(() =>
      buildSettlementReconciliation({ ...valid, participants: [] }),
    ).toThrow(/at least one/);
    expect(() =>
      buildSettlementReconciliation({
        ...valid,
        participants: [participants[0], participants[0]],
        expectedGrandTotalMinor: 6_000,
      }),
    ).toThrow(/unique/);
    expect(() =>
      buildSettlementReconciliation({
        ...valid,
        participants: [{ userId: '', expectedTotalMinor: 10_000 }],
      }),
    ).toThrow(/Participant ID/);
    expect(() =>
      buildSettlementReconciliation({
        ...valid,
        participants: [{ userId: 'user-a', expectedTotalMinor: -1 }],
        expectedGrandTotalMinor: 0,
      }),
    ).toThrow(/Participant expected total/);
    expect(() =>
      buildSettlementReconciliation({ ...valid, expectedGrandTotalMinor: 9_999 }),
    ).toThrow(/must equal/);
    expect(() =>
      buildSettlementReconciliation({
        ...valid,
        strategy: SETTLEMENT_ALLOCATION_STRATEGY.manual,
        actualGrandTotalMinor: 10_100,
        manualAdjustmentsMinor: { unknown: 100 },
      }),
    ).toThrow(/unknown participant/);
    expect(() =>
      buildSettlementReconciliation({
        ...valid,
        strategy: SETTLEMENT_ALLOCATION_STRATEGY.manual,
        actualGrandTotalMinor: 10_100,
        manualAdjustmentsMinor: { 'user-a': 90 },
      }),
    ).toThrow(/must total/);
  });

  it('rejects negative participant results and mismatched snapshot application', () => {
    expect(() =>
      buildSettlementReconciliation({
        currency: 'EGP',
        expectedGrandTotalMinor: 10_000,
        actualGrandTotalMinor: 0,
        strategy: SETTLEMENT_ALLOCATION_STRATEGY.equal,
        participants: [
          { userId: 'user-a', expectedTotalMinor: 1 },
          { userId: 'user-b', expectedTotalMinor: 9_999 },
        ],
        confirmedBy: 'owner-1',
        confirmedAt: createdAt,
        revision: 1,
      }),
    ).toThrow(/cannot make a participant total negative/);

    const snapshot = buildSettlementReconciliation({
      currency: 'EGP',
      expectedGrandTotalMinor: 10_000,
      actualGrandTotalMinor: 10_000,
      strategy: SETTLEMENT_ALLOCATION_STRATEGY.equal,
      participants,
      confirmedBy: 'owner-1',
      confirmedAt: createdAt,
      revision: 1,
    });

    expect(() =>
      applySettlementReconciliation(
        { ...createSettlement('user-a', 7_000), currency: 'USD' },
        snapshot,
      ),
    ).toThrow(/currencies/);
    expect(() =>
      applySettlementReconciliation(createSettlement('missing', 1), snapshot),
    ).toThrow(/no adjustment/);
    expect(() =>
      applySettlementReconciliation(createSettlement('user-a', 6_999), snapshot),
    ).toThrow(/expected total/);
  });
});

describe('settlement summaries', () => {
  it('summarizes every amount and payment status', () => {
    const unpaid = createSettlement('unpaid', 100);
    const declared = transitionParticipantPaymentStatus(
      createSettlement('declared', 200),
      PAYMENT_STATUS.declaredPaid,
      'declared',
      createdAt,
    );
    const proof = transitionParticipantPaymentStatus(
      createSettlement('proof', 300),
      PAYMENT_STATUS.proofSubmitted,
      'proof',
      createdAt,
      'proof-id',
    );
    const verified = transitionParticipantPaymentStatus(
      proof,
      PAYMENT_STATUS.verified,
      'owner-1',
      createdAt,
    );
    const rejected = transitionParticipantPaymentStatus(
      transitionParticipantPaymentStatus(
        createSettlement('rejected', 400),
        PAYMENT_STATUS.declaredPaid,
        'rejected',
        createdAt,
      ),
      PAYMENT_STATUS.rejected,
      'owner-1',
      createdAt,
    );
    const waived = transitionParticipantPaymentStatus(
      createSettlement('waived', 500),
      PAYMENT_STATUS.waived,
      'owner-1',
      createdAt,
    );
    const refunded = transitionParticipantPaymentStatus(
      transitionParticipantPaymentStatus(
        createSettlement('refunded', 600),
        PAYMENT_STATUS.waived,
        'owner-1',
        createdAt,
      ),
      PAYMENT_STATUS.refunded,
      'owner-1',
      createdAt,
    );

    expect(
      summarizeSettlements([
        unpaid,
        declared,
        proof,
        verified,
        rejected,
        waived,
        refunded,
      ]),
    ).toEqual({
      participantCount: 7,
      expectedGrandTotalMinor: 2_400,
      reconciledGrandTotalMinor: 2_400,
      paidGrandTotalMinor: 800,
      outstandingGrandTotalMinor: 1_600,
      verifiedGrandTotalMinor: 300,
      unpaidCount: 1,
      declaredPaidCount: 1,
      proofSubmittedCount: 1,
      verifiedCount: 1,
      rejectedCount: 1,
      waivedCount: 1,
      refundedCount: 1,
    });
  });
});
