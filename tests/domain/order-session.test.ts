import { describe, expect, it } from 'vitest';

import {
  ORDER_SESSION_STATUS,
  PARTICIPANT_IDENTITY_KIND,
  PARTICIPANT_RESPONSE,
  SESSION_PARTICIPANT_ROLE,
  assertSessionAcceptsContributions,
  canTransitionOrderSession,
  canTransitionParticipantResponse,
  createOrderSession,
  createSessionParticipant,
  isParticipantEligibleForFinalization,
  isSessionContributionOpen,
  markParticipantResponse,
  summarizeParticipantResponses,
  transitionOrderSession,
} from '@/modules/data-access';

const createdAt = '2026-07-18T08:00:00.000Z';
const deadlineAt = '2026-07-18T10:00:00.000Z';

const session = () =>
  createOrderSession({
    id: 'session-1',
    menuTemplateId: 'menu-1',
    sourceMenuRevision: 2,
    organizerId: 'owner-1',
    workspaceId: 'workspace-1',
    title: 'Team breakfast',
    currency: 'EGP',
    timezone: 'Africa/Cairo',
    deadlineAt,
    autoLock: true,
    scheduleOccurrenceKey: 'schedule-1:2026-07-18',
    createdAt,
  });

const participant = (userId = 'user-1') =>
  createSessionParticipant({
    userId,
    displayName: `User ${userId}`,
    identityKind: PARTICIPANT_IDENTITY_KIND.account,
    role: SESSION_PARTICIPANT_ROLE.participant,
    joinedAt: createdAt,
  });

describe('order session lifecycle', () => {
  it('creates a normalized draft session with explicit empty summaries', () => {
    expect(session()).toEqual({
      id: 'session-1',
      menuTemplateId: 'menu-1',
      sourceMenuRevision: 2,
      organizerId: 'owner-1',
      workspaceId: 'workspace-1',
      title: 'Team breakfast',
      currency: 'EGP',
      timezone: 'Africa/Cairo',
      status: ORDER_SESSION_STATUS.draft,
      deadlineAt,
      autoLock: true,
      scheduleOccurrenceKey: 'schedule-1:2026-07-18',
      responseSummary: {
        pending: 0,
        viewed: 0,
        ordering: 0,
        done: 0,
        skipped: 0,
        removed: 0,
        eligibleForFinalization: 0,
        total: 0,
      },
      settlementSummary: {
        participantCount: 0,
        expectedGrandTotalMinor: 0,
        outstandingGrandTotalMinor: 0,
        verifiedGrandTotalMinor: 0,
        settledParticipantCount: 0,
      },
      schemaVersion: 1,
      revision: 1,
      openedAt: null,
      lockedAt: null,
      submittedAt: null,
      confirmedAt: null,
      deliveredAt: null,
      settlingAt: null,
      settledAt: null,
      cancelledAt: null,
      createdAt,
      updatedAt: createdAt,
    });
  });

  it('normalizes optional blank values and validates required draft fields', () => {
    const minimal = createOrderSession({
      id: 'session-2',
      menuTemplateId: 'menu-2',
      sourceMenuRevision: 1,
      organizerId: 'owner-2',
      workspaceId: '   ',
      title: 'Lunch',
      currency: 'USD',
      timezone: 'UTC',
      scheduleOccurrenceKey: ' ',
      createdAt,
    });

    expect(minimal).toMatchObject({
      workspaceId: null,
      deadlineAt: null,
      autoLock: false,
      scheduleOccurrenceKey: null,
    });
    expect(() => createOrderSession({ ...minimal, id: ' ' })).toThrow(/Session ID/);
    expect(() =>
      createOrderSession({
        ...minimal,
        id: 'session-2',
        menuTemplateId: ' ',
      }),
    ).toThrow(/Menu template ID/);
    expect(() =>
      createOrderSession({ ...minimal, sourceMenuRevision: 0 }),
    ).toThrow(/Source menu revision/);
    expect(() => createOrderSession({ ...minimal, organizerId: '' })).toThrow(
      /Organizer ID/,
    );
    expect(() => createOrderSession({ ...minimal, title: '' })).toThrow(
      /Session title/,
    );
    expect(() => createOrderSession({ ...minimal, timezone: '' })).toThrow(
      /Timezone/,
    );
    expect(() => createOrderSession({ ...minimal, createdAt: 'invalid' })).toThrow(
      /Created time/,
    );
    expect(() => createOrderSession({ ...minimal, deadlineAt: 'invalid' })).toThrow(
      /Deadline/,
    );
  });

  it('executes the complete valid lifecycle with deterministic timestamps', () => {
    const collecting = transitionOrderSession(
      session(),
      ORDER_SESSION_STATUS.collecting,
      'owner-1',
      '2026-07-18T08:05:00.000Z',
    );
    const locked = transitionOrderSession(
      collecting,
      ORDER_SESSION_STATUS.locked,
      'owner-1',
      '2026-07-18T10:00:00.000Z',
    );
    const submitted = transitionOrderSession(
      locked,
      ORDER_SESSION_STATUS.submitted,
      'owner-1',
      '2026-07-18T10:05:00.000Z',
    );
    const confirmed = transitionOrderSession(
      submitted,
      ORDER_SESSION_STATUS.confirmed,
      'owner-1',
      '2026-07-18T10:10:00.000Z',
    );
    const delivered = transitionOrderSession(
      confirmed,
      ORDER_SESSION_STATUS.delivered,
      'owner-1',
      '2026-07-18T11:00:00.000Z',
    );
    const settling = transitionOrderSession(
      delivered,
      ORDER_SESSION_STATUS.settling,
      'owner-1',
      '2026-07-18T11:05:00.000Z',
    );
    const settled = transitionOrderSession(
      settling,
      ORDER_SESSION_STATUS.settled,
      'owner-1',
      '2026-07-18T11:30:00.000Z',
    );

    expect(collecting).toMatchObject({
      status: 'collecting',
      openedAt: '2026-07-18T08:05:00.000Z',
      revision: 2,
    });
    expect(locked.lockedAt).toBe('2026-07-18T10:00:00.000Z');
    expect(submitted.submittedAt).toBe('2026-07-18T10:05:00.000Z');
    expect(confirmed.confirmedAt).toBe('2026-07-18T10:10:00.000Z');
    expect(delivered.deliveredAt).toBe('2026-07-18T11:00:00.000Z');
    expect(settling.settlingAt).toBe('2026-07-18T11:05:00.000Z');
    expect(settled).toMatchObject({
      status: 'settled',
      settledAt: '2026-07-18T11:30:00.000Z',
      revision: 8,
    });
    expect(transitionOrderSession(settled, ORDER_SESSION_STATUS.settled, 'owner-1')).toBe(
      settled,
    );
  });

  it('supports an explicit locked-to-collecting reopen and cancellation paths', () => {
    const collecting = transitionOrderSession(
      session(),
      ORDER_SESSION_STATUS.collecting,
      'owner-1',
      '2026-07-18T08:05:00.000Z',
    );
    const locked = transitionOrderSession(
      collecting,
      ORDER_SESSION_STATUS.locked,
      'owner-1',
      '2026-07-18T09:00:00.000Z',
    );
    const reopened = transitionOrderSession(
      locked,
      ORDER_SESSION_STATUS.collecting,
      'owner-1',
      '2026-07-18T09:05:00.000Z',
    );
    const cancelled = transitionOrderSession(
      reopened,
      ORDER_SESSION_STATUS.cancelled,
      'owner-1',
      '2026-07-18T09:10:00.000Z',
    );

    expect(reopened).toMatchObject({
      openedAt: '2026-07-18T08:05:00.000Z',
      lockedAt: null,
      status: 'collecting',
    });
    expect(cancelled.cancelledAt).toBe('2026-07-18T09:10:00.000Z');
    expect(
      transitionOrderSession(
        session(),
        ORDER_SESSION_STATUS.cancelled,
        'owner-1',
        '2026-07-18T08:01:00.000Z',
      ).status,
    ).toBe('cancelled');
  });

  it('rejects invalid transitions, actors, and timestamps', () => {
    expect(canTransitionOrderSession('draft', 'collecting')).toBe(true);
    expect(canTransitionOrderSession('draft', 'draft')).toBe(true);
    expect(canTransitionOrderSession('draft', 'settled')).toBe(false);
    expect(() =>
      transitionOrderSession(session(), ORDER_SESSION_STATUS.settled, 'owner-1'),
    ).toThrow(/cannot transition/);
    expect(() =>
      transitionOrderSession(session(), ORDER_SESSION_STATUS.collecting, ' '),
    ).toThrow(/actor/);
    expect(() =>
      transitionOrderSession(
        session(),
        ORDER_SESSION_STATUS.collecting,
        'owner-1',
        'invalid',
      ),
    ).toThrow(/Transition time/);
  });
});

describe('session participant responses', () => {
  it('creates privacy-minimal pending participants', () => {
    expect(participant()).toEqual({
      userId: 'user-1',
      displayName: 'User user-1',
      identityKind: 'account',
      role: 'participant',
      response: 'pending',
      includeInFinalOrder: false,
      firstViewedAt: null,
      completedAt: null,
      skippedAt: null,
      removedAt: null,
      lastActivityAt: createdAt,
      reminderCount: 0,
      lastReminderAt: null,
      revision: 1,
      joinedAt: createdAt,
      updatedAt: createdAt,
    });
    expect(() => createSessionParticipant({ ...participant(), userId: '' })).toThrow(
      /Participant ID/,
    );
    expect(() =>
      createSessionParticipant({ ...participant(), displayName: '' }),
    ).toThrow(/display name/);
    expect(() =>
      createSessionParticipant({ ...participant(), joinedAt: 'invalid' }),
    ).toThrow(/Joined time/);
  });

  it('tracks viewed, ordering, done, skipped, and removed transitions explicitly', () => {
    const viewed = markParticipantResponse(
      participant(),
      PARTICIPANT_RESPONSE.viewed,
      '2026-07-18T08:10:00.000Z',
    );
    const ordering = markParticipantResponse(
      viewed,
      PARTICIPANT_RESPONSE.ordering,
      '2026-07-18T08:12:00.000Z',
    );
    const done = markParticipantResponse(
      ordering,
      PARTICIPANT_RESPONSE.done,
      '2026-07-18T08:15:00.000Z',
    );
    const skipped = markParticipantResponse(
      done,
      PARTICIPANT_RESPONSE.skipped,
      '2026-07-18T08:20:00.000Z',
    );
    const removed = markParticipantResponse(
      skipped,
      PARTICIPANT_RESPONSE.removed,
      '2026-07-18T08:25:00.000Z',
    );

    expect(viewed).toMatchObject({
      firstViewedAt: '2026-07-18T08:10:00.000Z',
      includeInFinalOrder: false,
    });
    expect(ordering).toMatchObject({
      firstViewedAt: '2026-07-18T08:10:00.000Z',
      includeInFinalOrder: true,
    });
    expect(done).toMatchObject({
      completedAt: '2026-07-18T08:15:00.000Z',
      includeInFinalOrder: true,
    });
    expect(isParticipantEligibleForFinalization(done)).toBe(true);
    expect(skipped).toMatchObject({
      completedAt: null,
      skippedAt: '2026-07-18T08:20:00.000Z',
      includeInFinalOrder: false,
    });
    expect(removed).toMatchObject({
      skippedAt: null,
      removedAt: '2026-07-18T08:25:00.000Z',
      includeInFinalOrder: false,
    });
    expect(isParticipantEligibleForFinalization(removed)).toBe(false);
    expect(markParticipantResponse(removed, PARTICIPANT_RESPONSE.removed)).toBe(removed);
  });

  it('supports direct completion and reopening while rejecting terminal mutations', () => {
    const done = markParticipantResponse(
      participant(),
      PARTICIPANT_RESPONSE.done,
      '2026-07-18T08:15:00.000Z',
    );
    const ordering = markParticipantResponse(
      done,
      PARTICIPANT_RESPONSE.ordering,
      '2026-07-18T08:20:00.000Z',
    );
    const removed = markParticipantResponse(
      ordering,
      PARTICIPANT_RESPONSE.removed,
      '2026-07-18T08:25:00.000Z',
    );

    expect(done.firstViewedAt).toBe('2026-07-18T08:15:00.000Z');
    expect(ordering.completedAt).toBeNull();
    expect(canTransitionParticipantResponse('removed', 'done')).toBe(false);
    expect(() =>
      markParticipantResponse(
        removed,
        PARTICIPANT_RESPONSE.done,
        '2026-07-18T08:30:00.000Z',
      ),
    ).toThrow(/cannot transition/);
    expect(() =>
      markParticipantResponse(participant(), PARTICIPANT_RESPONSE.viewed, 'invalid'),
    ).toThrow(/response time/);
  });

  it('summarizes every response and finalization eligibility', () => {
    const participants = [
      participant('pending'),
      markParticipantResponse(participant('viewed'), PARTICIPANT_RESPONSE.viewed, createdAt),
      markParticipantResponse(
        participant('ordering'),
        PARTICIPANT_RESPONSE.ordering,
        createdAt,
      ),
      markParticipantResponse(participant('done'), PARTICIPANT_RESPONSE.done, createdAt),
      markParticipantResponse(
        participant('skipped'),
        PARTICIPANT_RESPONSE.skipped,
        createdAt,
      ),
      markParticipantResponse(
        participant('removed'),
        PARTICIPANT_RESPONSE.removed,
        createdAt,
      ),
    ];

    expect(summarizeParticipantResponses(participants)).toEqual({
      pending: 1,
      viewed: 1,
      ordering: 1,
      done: 1,
      skipped: 1,
      removed: 1,
      eligibleForFinalization: 1,
      total: 6,
    });
  });
});

describe('session contribution availability', () => {
  it('accepts contributions only while collecting before the deadline', () => {
    const collecting = transitionOrderSession(
      session(),
      ORDER_SESSION_STATUS.collecting,
      'owner-1',
      '2026-07-18T08:05:00.000Z',
    );

    expect(isSessionContributionOpen(collecting, '2026-07-18T09:59:59.999Z')).toBe(true);
    expect(isSessionContributionOpen(collecting, deadlineAt)).toBe(false);
    expect(isSessionContributionOpen(collecting, 'invalid')).toBe(false);
    expect(isSessionContributionOpen(session(), '2026-07-18T09:00:00.000Z')).toBe(false);
    expect(() =>
      assertSessionAcceptsContributions(collecting, '2026-07-18T09:00:00.000Z'),
    ).not.toThrow();
    expect(() => assertSessionAcceptsContributions(collecting, deadlineAt)).toThrow(
      /deadline/,
    );
    expect(() => assertSessionAcceptsContributions(session(), createdAt)).toThrow(
      /not collecting/,
    );
  });

  it('keeps a collecting session open when no deadline is configured', () => {
    const noDeadline = transitionOrderSession(
      createOrderSession({
        id: 'session-2',
        menuTemplateId: 'menu-2',
        sourceMenuRevision: 1,
        organizerId: 'owner-1',
        title: 'Open order',
        currency: 'EGP',
        timezone: 'Africa/Cairo',
        createdAt,
      }),
      ORDER_SESSION_STATUS.collecting,
      'owner-1',
      createdAt,
    );

    expect(isSessionContributionOpen(noDeadline, '2027-01-01T00:00:00.000Z')).toBe(true);
  });
});
