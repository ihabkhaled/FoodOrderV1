import { describe, expect, it } from 'vitest';

import {
  PAYMENT_STATUS,
  SETTLEMENT_ALLOCATION_STRATEGY,
  applySettlementReconciliation,
  buildSettlementReconciliation,
  canTransitionPaymentStatus,
  createParticipantSettlement,
  summarizeSettlements,
  transitionParticipantPaymentStatus,
} from '@/modules/data-access';

const createdAt = '2026-07-18T11:00:00.000Z';

const settlement = (userId = 'user-1', expectedTotalMinor = 10_000) =>
  createParticipantSettlement({
    sessionId: 'session-1',
    userId,
    currency: 'EGP',
    expectedTotalMinor,
    createdAt,
  });

describe('participant settlement status', () => {
  it('creates an unpaid minor-unit settlement', () => {
    expect(settlement()).toEqual({
      sessionId: 'session-1',
      userId: 'user-1',
      currency: 'EGP',
      expectedTotalMinor: 10_000,
      adjustmentMinor: 0,
      reconciledTotalMinor: 10_000,
      paidMinor: 0,
      outstandingMinor: 10_000,
      status: 'unpaid',
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

  it('validates settlement identity, timestamps, and money', () => {
    expect(() => createParticipantSettlement({ ...settlement(), sessionId: '' })).toThrow(
      /Session ID/,
    );
    expect(() => createParticipantSettlement({ ...settlement(), userId: '' })).toThrow(
      /Participant ID/,
    );
    expect(() =>
      createParticipantSettlement({ ...settlement(), expectedTotalMinor: -1 }),
    ).toThrow(/Expected total/);
    expect(() =>
      createParticipantSettlement({ ...settlement(), expectedTotalMinor: 1.5 }),
    ).toThrow(/Expected total/);
    expect(() =>
      createParticipantSettlement({ ...settlement(), createdAt: 'invalid' }),
    ).toThrow(/Created time/);
  });

  it('supports declaration, proof, verification, and refund with audit fields', () => {
    const declared = transitionParticipantPaymentStatus(
      settlement(),
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
      status: 'declared_paid',
      declaredAt: '2026-07-18T11:05:00.000Z',
      paidMinor: 0,
      outstandingMinor: 10_000,
    });
    expect(proof).toMatchObject({
      status: 'proof_submitted',
      proofAttachmentId: 'proof-1',
      proofSubmittedAt: '2026-07-18T11:06:00.000Z',
    });
    expect(verified).toMatchObject({
      status: 'verified',
      verifiedAt: '2026-07-18T11:10:00.000Z',
      statusActorId: 'owner-1',
      paidMinor: 10_000,
      outstandingMinor: 0,
    });
    expect(refunded).toMatchObject({
      status: 'refunded',
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

  it('supports rejection, retry, direct proof, and waiver paths', () => {
    const directProof = transitionParticipantPaymentStatus(
      settlement(),
      PAYMENT_STATUS.proofSubmitted,
      'user-1',
      '2026-07-18T11:05:00.000Z',
      'proof-1',
    );
    const rejected = transitionParticipantPaymentStatus(
      directProof,
      PAYMENT_STATUS.rejected,
      'owner-1',
      '2026-07-18T11:10:00.000Z',
    );
    const retried = transitionParticipantPaymentStatus(
      rejected,
      PAYMENT_STATUS.declaredPaid,
      'user-1',
      '2026-07-18T11:15:00.000Z',
    );
    const unpaid = transitionParticipantPaymentStatus(
      retried,
      PAYMENT_STATUS.unpaid,
      'user-1',
      '2026-07-18T11:16:00.000Z',
    );
    const waived = transitionParticipantPaymentStatus(
      unpaid,
      PAYMENT_STATUS.waived,
      'owner-1',
      '2026-07-18T11:20:00.000Z',
    );

    expect(rejected.rejectedAt).toBe('2026-07-18T11:10:00.000Z');
    expect(retried.status).toBe('declared_paid');
    expect(unpaid.status).toBe('unpaid');
    expect(waived).toMatchObject({
      waivedAt: '2026-07-18T11:20:00.000Z',
      paidMinor: 10_000,
      outstandingMinor: 0,
    });
  });

  it('rejects missing proof, invalid actors/times, and invalid transitions', () => {
    expect(canTransitionPaymentStatus('unpaid', 'declared_paid')).toBe(true);
    expect(canTransitionPaymentStatus('unpaid', 'unpaid')).toBe(true);
    expect(canTransitionPaymentStatus('unpaid', 'verified')).toBe(false);
    expect(() =>
      transitionParticipantPaymentStatus(
        settlement(),
        PAYMENT_STATUS.proofSubmitted,
        'user-1',
        createdAt,
      ),
    ).toThrow(/proof attachment/);
    expect(() =>
      transitionParticipantPaymentStatus(
        settlement(),
        PAYMENT_STATUS.declaredPaid,
        '',
        createdAt,
      ),
    ).toThrow(/actor/);
    expect(() =>
      transitionParticipantPaymentStatus(
        settlement(),
        PAYMENT_STATUS.declaredPaid,
        'user-1',
        'invalid',
      ),
    ).toThrow(/status time/);
    expect(() =>
      transitionParticipantPaymentStatus(
        settlement(),
        PAYMENT_STATUS.verified,
        'owner-1',
        createdAt,
      ),
    ).toThrow(/cannot transition/);
  });
});

describe('receipt reconciliation', () => {
  const participants = [
    { userId: 'user-b', expectedTotalMinor: 3_000 },
    { userId: 'user-a', expectedTotalMinor: 7_000 },
  ];

  it('allocates a positive equal difference deterministically', () => {
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

    expect(snapshot).toEqual({
      currency: 'EGP',
      expectedGrandTotalMinor: 10_000,
      actualGrandTotalMinor: 10_101,
      differenceMinor: 101,
      strategy: 'equal',
      participantAdjustments: [
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
      ],
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

    expect(positive.participantAdjustments).toEqual([
      {
        userId: 'user-a',
        expectedTotalMinor: 7_000,
        adjustmentMinor: 700,
        reconciledTotalMinor: 7_700,
      },
      {
        userId: 'user-b',
        expectedTotalMinor: 3_000,
        adjustmentMinor: 300,
        reconciledTotalMinor: 3_300,
      },
    ]);
    expect(negative.participantAdjustments).toEqual([
      {
        userId: 'user-a',
        expectedTotalMinor: 7_000,
        adjustmentMinor: -700,
        reconciledTotalMinor: 6_300,
      },
      {
        userId: 'user-b',
        expectedTotalMinor: 3_000,
        adjustmentMinor: -300,
        reconciledTotalMinor: 2_700,
      },
    ]);
  });

  it('accepts exact manual adjustments and applies them to settlements', () => {
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
    const verified = transitionParticipantPaymentStatus(
      settlement('user-a', 7_000),
      PAYMENT_STATUS.waived,
      'owner-1',
      '2026-07-18T11:30:00.000Z',
    );
    const applied = applySettlementReconciliation(verified, snapshot);

    expect(applied).toMatchObject({
      adjustmentMinor: 200,
      reconciledTotalMinor: 7_200,
      paidMinor: 7_000,
      outstandingMinor: 200,
      revision: 3,
      updatedAt: '2026-07-18T12:00:00.000Z',
    });
  });

  it('rejects invalid totals, participants, manual adjustments, and negative results', () => {
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
        manualAdjustmentsMinor: { 'unknown-user': 100 },
      }),
    ).toThrow(/unknown participant/);
    expect(() =>
      buildSettlementReconciliation({
        ...valid,
        strategy: SETTLEMENT_ALLOCATION_STRATEGY.manual,
        actualGrandTotalMinor: 10_100,
        manualAdjustmentsMinor: { 'user-a': 90, 'user-b': 0 },
      }),
    ).toThrow(/must total/);
    expect(() =>
      buildSettlementReconciliation({
        ...valid,
        actualGrandTotalMinor: 0,
        strategy: SETTLEMENT_ALLOCATION_STRATEGY.equal,
        participants: [
          { userId: 'user-a', expectedTotalMinor: 1 },
          { userId: 'user-b', expectedTotalMinor: 9_999 },
        ],
      }),
    ).toThrow(/cannot make a participant total negative/);
  });

  it('rejects applying mismatched reconciliation snapshots', () => {
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
        { ...settlement('user-a', 7_000), currency: 'USD' },
        snapshot,
      ),
    ).toThrow(/currencies/);
    expect(() => applySettlementReconciliation(settlement('missing', 1), snapshot)).toThrow(
      /no adjustment/,
    );
    expect(() =>
      applySettlementReconciliation(settlement('user-a', 6_999), snapshot),
    ).toThrow(/expected total/);
  });
});

describe('settlement summary', () => {
  it('summarizes amounts and every payment status', () => {
    const unpaid = settlement('unpaid', 100);
    const declared = transitionParticipantPaymentStatus(
      settlement('declared', 200),
      PAYMENT_STATUS.declaredPaid,
      'declared',
      createdAt,
    );
    const proof = transitionParticipantPaymentStatus(
      settlement('proof', 300),
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
        settlement('rejected', 400),
        PAYMENT_STATUS.declaredPaid,
        'rejected',
        createdAt,
      ),
      PAYMENT_STATUS.rejected,
      'owner-1',
      createdAt,
    );
    const waived = transitionParticipantPaymentStatus(
      settlement('waived', 500),
      PAYMENT_STATUS.waived,
      'owner-1',
      createdAt,
    );
    const refunded = transitionParticipantPaymentStatus(
      transitionParticipantPaymentStatus(
        settlement('refunded', 600),
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
