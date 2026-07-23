import { describe, expect, it } from 'vitest';

import {
  assertSessionAcceptsContributions,
  canTransitionOrderSession,
  canTransitionParticipantResponse,
  createOrderSession,
  createSessionParticipant,
  DEFAULT_PRICING_POLICY,
  isParticipantEligibleForFinalization,
  isSessionContributionOpen,
  markParticipantResponse,
  ORDER_SESSION_STATUS,
  type OrderSessionDraft,
  PARTICIPANT_IDENTITY_KIND,
  PARTICIPANT_RESPONSE,
  SESSION_PARTICIPANT_ROLE,
  type SessionMenuItemSnapshot,
  summarizeParticipantResponses,
  transitionOrderSession,
} from '@/modules/data-access';

const CREATED_AT = '2026-07-18T08:00:00.000Z';
const DEADLINE_AT = '2026-07-18T10:00:00.000Z';
const MENU_ITEMS: SessionMenuItemSnapshot[] = [
  {
    id: 'meal',
    name: 'Meal',
    description: 'Breakfast meal',
    category: 'Main',
    unitPriceMinor: 10_000,
    active: true,
    sortOrder: 0,
    createdByUserId: null,
    createdByName: null,
    source: 'catalog',
  },
];

const sessionDraft = (): OrderSessionDraft => ({
  id: 'session-1',
  menuTemplateId: 'menu-1',
  sourceMenuRevision: 2,
  organizerId: 'owner-1',
  workspaceId: 'workspace-1',
  title: 'Team breakfast',
  currency: 'EGP',
  timezone: 'Africa/Cairo',
  deadlineAt: DEADLINE_AT,
  autoLock: true,
  scheduleOccurrenceKey: 'schedule-1:2026-07-18',
  menuItems: MENU_ITEMS,
  pricingPolicy: DEFAULT_PRICING_POLICY,
  createdAt: CREATED_AT,
});

const session = () => createOrderSession(sessionDraft());

const participant = (userId = 'user-1') =>
  createSessionParticipant({
    userId,
    displayName: `User ${userId}`,
    identityKind: PARTICIPANT_IDENTITY_KIND.account,
    role: SESSION_PARTICIPANT_ROLE.participant,
    joinedAt: CREATED_AT,
  });

describe('order session lifecycle', () => {
  it('creates a normalized immutable session draft', () => {
    expect(session()).toMatchObject({
      id: 'session-1',
      menuTemplateId: 'menu-1',
      sourceMenuRevision: 2,
      organizerId: 'owner-1',
      workspaceId: 'workspace-1',
      title: 'Team breakfast',
      currency: 'EGP',
      timezone: 'Africa/Cairo',
      status: ORDER_SESSION_STATUS.draft,
      deadlineAt: DEADLINE_AT,
      autoLock: true,
      scheduleOccurrenceKey: 'schedule-1:2026-07-18',
      menuItems: MENU_ITEMS,
      pricingPolicy: DEFAULT_PRICING_POLICY,
      aggregate: {},
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
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    });
  });

  it('normalizes optional blank values', () => {
    const minimal = createOrderSession({
      ...sessionDraft(),
      id: 'session-2',
      workspaceId: ' '.repeat(3),
      deadlineAt: null,
      autoLock: undefined,
      scheduleOccurrenceKey: ' ',
    });

    expect(minimal).toMatchObject({
      workspaceId: null,
      deadlineAt: null,
      autoLock: false,
      scheduleOccurrenceKey: null,
    });
  });

  it.each([
    ['session identifier', { id: ' ' }, /Session ID/],
    ['menu identifier', { menuTemplateId: ' ' }, /Menu template ID/],
    ['source revision', { sourceMenuRevision: 0 }, /Source menu revision/],
    ['organizer identifier', { organizerId: '' }, /Organizer ID/],
    ['title', { title: '' }, /Session title/],
    ['timezone', { timezone: '' }, /Timezone/],
    ['created time', { createdAt: 'invalid' }, /Created time/],
    ['deadline', { deadlineAt: 'invalid' }, /Deadline/],
  ])('rejects an invalid %s', (_label, patch, expected) => {
    expect(() => createOrderSession({ ...sessionDraft(), ...patch })).toThrow(
      expected,
    );
  });

  it('executes the complete lifecycle with deterministic timestamps', () => {
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
      status: ORDER_SESSION_STATUS.collecting,
      openedAt: '2026-07-18T08:05:00.000Z',
      revision: 2,
    });
    expect(locked.lockedAt).toBe('2026-07-18T10:00:00.000Z');
    expect(submitted.submittedAt).toBe('2026-07-18T10:05:00.000Z');
    expect(confirmed.confirmedAt).toBe('2026-07-18T10:10:00.000Z');
    expect(delivered.deliveredAt).toBe('2026-07-18T11:00:00.000Z');
    expect(settling.settlingAt).toBe('2026-07-18T11:05:00.000Z');
    expect(settled).toMatchObject({
      status: ORDER_SESSION_STATUS.settled,
      settledAt: '2026-07-18T11:30:00.000Z',
      revision: 8,
    });
    expect(
      transitionOrderSession(settled, ORDER_SESSION_STATUS.settled, 'owner-1'),
    ).toBe(settled);
  });

  it('supports reopening a lock and explicit cancellation', () => {
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
      status: ORDER_SESSION_STATUS.collecting,
    });
    expect(cancelled.cancelledAt).toBe('2026-07-18T09:10:00.000Z');
  });

  it('rejects invalid lifecycle transitions, actors, and timestamps', () => {
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
      identityKind: PARTICIPANT_IDENTITY_KIND.account,
      role: SESSION_PARTICIPANT_ROLE.participant,
      response: PARTICIPANT_RESPONSE.pending,
      includeInFinalOrder: false,
      firstViewedAt: null,
      completedAt: null,
      skippedAt: null,
      removedAt: null,
      lastActivityAt: CREATED_AT,
      reminderCount: 0,
      lastReminderAt: null,
      revision: 1,
      joinedAt: CREATED_AT,
      updatedAt: CREATED_AT,
    });
  });

  it('tracks the explicit response lifecycle and eligibility', () => {
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

    expect(viewed.firstViewedAt).toBe('2026-07-18T08:10:00.000Z');
    expect(ordering.includeInFinalOrder).toBe(true);
    expect(done.completedAt).toBe('2026-07-18T08:15:00.000Z');
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
    expect(markParticipantResponse(removed, PARTICIPANT_RESPONSE.removed)).toBe(
      removed,
    );
  });

  it('summarizes every response without inferring empty quantities', () => {
    const participants = [
      participant('pending'),
      markParticipantResponse(
        participant('viewed'),
        PARTICIPANT_RESPONSE.viewed,
        CREATED_AT,
      ),
      markParticipantResponse(
        participant('ordering'),
        PARTICIPANT_RESPONSE.ordering,
        CREATED_AT,
      ),
      markParticipantResponse(
        participant('done'),
        PARTICIPANT_RESPONSE.done,
        CREATED_AT,
      ),
      markParticipantResponse(
        participant('skipped'),
        PARTICIPANT_RESPONSE.skipped,
        CREATED_AT,
      ),
      markParticipantResponse(
        participant('removed'),
        PARTICIPANT_RESPONSE.removed,
        CREATED_AT,
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

  it('rejects invalid response transitions and timestamps', () => {
    const removed = markParticipantResponse(
      participant(),
      PARTICIPANT_RESPONSE.removed,
      CREATED_AT,
    );
    expect(canTransitionParticipantResponse('pending', 'done')).toBe(true);
    expect(canTransitionParticipantResponse('removed', 'done')).toBe(false);
    expect(() =>
      markParticipantResponse(removed, PARTICIPANT_RESPONSE.done, CREATED_AT),
    ).toThrow(/cannot transition/);
    expect(() =>
      markParticipantResponse(
        participant(),
        PARTICIPANT_RESPONSE.done,
        'invalid',
      ),
    ).toThrow(/response time/);
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

    expect(
      isSessionContributionOpen(collecting, '2026-07-18T09:59:59.999Z'),
    ).toBe(true);
    expect(isSessionContributionOpen(collecting, DEADLINE_AT)).toBe(false);
    expect(isSessionContributionOpen(collecting, 'invalid')).toBe(false);
    expect(isSessionContributionOpen(session(), CREATED_AT)).toBe(false);
    expect(() =>
      { assertSessionAcceptsContributions(
        collecting,
        '2026-07-18T09:00:00.000Z',
      ); },
    ).not.toThrow();
    expect(() =>
      { assertSessionAcceptsContributions(collecting, DEADLINE_AT); },
    ).toThrow(/deadline/);
    expect(() => { assertSessionAcceptsContributions(session(), CREATED_AT); }).toThrow(
      /not collecting/,
    );
  });

  it('keeps a collecting session open without a deadline', () => {
    const noDeadline = transitionOrderSession(
      createOrderSession({
        ...sessionDraft(),
        id: 'session-2',
        deadlineAt: null,
      }),
      ORDER_SESSION_STATUS.collecting,
      'owner-1',
      CREATED_AT,
    );

    expect(
      isSessionContributionOpen(noDeadline, '2027-01-01T00:00:00.000Z'),
    ).toBe(true);
  });
});
