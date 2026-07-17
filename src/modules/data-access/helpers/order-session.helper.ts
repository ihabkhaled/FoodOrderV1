import { nowIso } from '@/shared/helpers';

import {
  ORDER_SESSION_STATUS,
  PARTICIPANT_RESPONSE,
  type OrderSessionStatus,
  type ParticipantResponse,
} from '../enums';
import type {
  OrderSession,
  OrderSessionDraft,
  ParticipantResponseSummary,
  SessionParticipant,
  SessionParticipantDraft,
} from '../types/order-session.types';

const ORDER_SESSION_TRANSITIONS = {
  draft: [ORDER_SESSION_STATUS.collecting, ORDER_SESSION_STATUS.cancelled],
  collecting: [ORDER_SESSION_STATUS.locked, ORDER_SESSION_STATUS.cancelled],
  locked: [
    ORDER_SESSION_STATUS.collecting,
    ORDER_SESSION_STATUS.submitted,
    ORDER_SESSION_STATUS.cancelled,
  ],
  submitted: [ORDER_SESSION_STATUS.confirmed, ORDER_SESSION_STATUS.cancelled],
  confirmed: [ORDER_SESSION_STATUS.delivered, ORDER_SESSION_STATUS.cancelled],
  delivered: [ORDER_SESSION_STATUS.settling],
  settling: [ORDER_SESSION_STATUS.settled],
  settled: [],
  cancelled: [],
} as const satisfies Record<OrderSessionStatus, readonly OrderSessionStatus[]>;

const PARTICIPANT_RESPONSE_TRANSITIONS = {
  pending: [
    PARTICIPANT_RESPONSE.viewed,
    PARTICIPANT_RESPONSE.ordering,
    PARTICIPANT_RESPONSE.done,
    PARTICIPANT_RESPONSE.skipped,
    PARTICIPANT_RESPONSE.removed,
  ],
  viewed: [
    PARTICIPANT_RESPONSE.ordering,
    PARTICIPANT_RESPONSE.done,
    PARTICIPANT_RESPONSE.skipped,
    PARTICIPANT_RESPONSE.removed,
  ],
  ordering: [
    PARTICIPANT_RESPONSE.done,
    PARTICIPANT_RESPONSE.skipped,
    PARTICIPANT_RESPONSE.removed,
  ],
  done: [
    PARTICIPANT_RESPONSE.ordering,
    PARTICIPANT_RESPONSE.skipped,
    PARTICIPANT_RESPONSE.removed,
  ],
  skipped: [
    PARTICIPANT_RESPONSE.ordering,
    PARTICIPANT_RESPONSE.done,
    PARTICIPANT_RESPONSE.removed,
  ],
  removed: [],
} as const satisfies Record<ParticipantResponse, readonly ParticipantResponse[]>;

const EMPTY_RESPONSE_SUMMARY: ParticipantResponseSummary = {
  pending: 0,
  viewed: 0,
  ordering: 0,
  done: 0,
  skipped: 0,
  removed: 0,
  eligibleForFinalization: 0,
  total: 0,
};

const assertRequiredText = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};

const assertIsoTimestamp = (value: string, label: string): string => {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be a valid ISO timestamp.`);
  }
  return value;
};

const assertPositiveRevision = (value: number, label: string): number => {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return value;
};

export const createOrderSession = (draft: OrderSessionDraft): OrderSession => {
  const createdAt = assertIsoTimestamp(draft.createdAt ?? nowIso(), 'Created time');
  const deadlineAt = draft.deadlineAt
    ? assertIsoTimestamp(draft.deadlineAt, 'Deadline')
    : null;

  return {
    id: assertRequiredText(draft.id, 'Session ID'),
    menuTemplateId: assertRequiredText(draft.menuTemplateId, 'Menu template ID'),
    sourceMenuRevision: assertPositiveRevision(
      draft.sourceMenuRevision,
      'Source menu revision',
    ),
    organizerId: assertRequiredText(draft.organizerId, 'Organizer ID'),
    workspaceId: draft.workspaceId?.trim() || null,
    title: assertRequiredText(draft.title, 'Session title'),
    currency: draft.currency,
    timezone: assertRequiredText(draft.timezone, 'Timezone'),
    status: ORDER_SESSION_STATUS.draft,
    deadlineAt,
    autoLock: draft.autoLock ?? false,
    scheduleOccurrenceKey: draft.scheduleOccurrenceKey?.trim() || null,
    responseSummary: { ...EMPTY_RESPONSE_SUMMARY },
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
  };
};

export const createSessionParticipant = (
  draft: SessionParticipantDraft,
): SessionParticipant => {
  const joinedAt = assertIsoTimestamp(draft.joinedAt ?? nowIso(), 'Joined time');

  return {
    userId: assertRequiredText(draft.userId, 'Participant ID'),
    displayName: assertRequiredText(draft.displayName, 'Participant display name'),
    identityKind: draft.identityKind,
    role: draft.role,
    response: PARTICIPANT_RESPONSE.pending,
    includeInFinalOrder: false,
    firstViewedAt: null,
    completedAt: null,
    skippedAt: null,
    removedAt: null,
    lastActivityAt: joinedAt,
    reminderCount: 0,
    lastReminderAt: null,
    revision: 1,
    joinedAt,
    updatedAt: joinedAt,
  };
};

export const canTransitionOrderSession = (
  currentStatus: OrderSessionStatus,
  nextStatus: OrderSessionStatus,
): boolean =>
  currentStatus === nextStatus ||
  ORDER_SESSION_TRANSITIONS[currentStatus].includes(nextStatus);

export const transitionOrderSession = (
  session: OrderSession,
  nextStatus: OrderSessionStatus,
  actorId: string,
  at: string = nowIso(),
): OrderSession => {
  if (session.status === nextStatus) return session;
  assertRequiredText(actorId, 'Transition actor');
  assertIsoTimestamp(at, 'Transition time');

  if (!canTransitionOrderSession(session.status, nextStatus)) {
    throw new Error(
      `Order session cannot transition from ${session.status} to ${nextStatus}.`,
    );
  }

  const next: OrderSession = {
    ...session,
    status: nextStatus,
    revision: session.revision + 1,
    updatedAt: at,
  };

  if (nextStatus === ORDER_SESSION_STATUS.collecting) {
    next.openedAt ??= at;
    if (session.status === ORDER_SESSION_STATUS.locked) next.lockedAt = null;
  }
  if (nextStatus === ORDER_SESSION_STATUS.locked) next.lockedAt = at;
  if (nextStatus === ORDER_SESSION_STATUS.submitted) next.submittedAt = at;
  if (nextStatus === ORDER_SESSION_STATUS.confirmed) next.confirmedAt = at;
  if (nextStatus === ORDER_SESSION_STATUS.delivered) next.deliveredAt = at;
  if (nextStatus === ORDER_SESSION_STATUS.settling) next.settlingAt = at;
  if (nextStatus === ORDER_SESSION_STATUS.settled) next.settledAt = at;
  if (nextStatus === ORDER_SESSION_STATUS.cancelled) next.cancelledAt = at;

  return next;
};

export const canTransitionParticipantResponse = (
  currentResponse: ParticipantResponse,
  nextResponse: ParticipantResponse,
): boolean =>
  currentResponse === nextResponse ||
  PARTICIPANT_RESPONSE_TRANSITIONS[currentResponse].includes(nextResponse);

export const markParticipantResponse = (
  participant: SessionParticipant,
  nextResponse: ParticipantResponse,
  at: string = nowIso(),
): SessionParticipant => {
  if (participant.response === nextResponse) return participant;
  assertIsoTimestamp(at, 'Participant response time');

  if (!canTransitionParticipantResponse(participant.response, nextResponse)) {
    throw new Error(
      `Participant response cannot transition from ${participant.response} to ${nextResponse}.`,
    );
  }

  const firstViewedAt =
    participant.firstViewedAt ??
    (nextResponse === PARTICIPANT_RESPONSE.pending ? null : at);
  const includeInFinalOrder =
    nextResponse === PARTICIPANT_RESPONSE.done ||
    nextResponse === PARTICIPANT_RESPONSE.ordering;

  return {
    ...participant,
    response: nextResponse,
    includeInFinalOrder,
    firstViewedAt,
    completedAt: nextResponse === PARTICIPANT_RESPONSE.done ? at : null,
    skippedAt: nextResponse === PARTICIPANT_RESPONSE.skipped ? at : null,
    removedAt: nextResponse === PARTICIPANT_RESPONSE.removed ? at : null,
    lastActivityAt: at,
    revision: participant.revision + 1,
    updatedAt: at,
  };
};

export const isParticipantEligibleForFinalization = (
  participant: SessionParticipant,
): boolean =>
  participant.response === PARTICIPANT_RESPONSE.done &&
  participant.includeInFinalOrder;

export const summarizeParticipantResponses = (
  participants: SessionParticipant[],
): ParticipantResponseSummary => {
  const summary = { ...EMPTY_RESPONSE_SUMMARY };

  for (const participant of participants) {
    summary[participant.response] += 1;
    summary.total += 1;
    if (isParticipantEligibleForFinalization(participant)) {
      summary.eligibleForFinalization += 1;
    }
  }

  return summary;
};

export const isSessionContributionOpen = (
  session: OrderSession,
  at: string = nowIso(),
): boolean => {
  if (session.status !== ORDER_SESSION_STATUS.collecting) return false;
  if (!session.deadlineAt) return true;
  if (Number.isNaN(Date.parse(at))) return false;
  return Date.parse(at) < Date.parse(session.deadlineAt);
};

export const assertSessionAcceptsContributions = (
  session: OrderSession,
  at: string = nowIso(),
): void => {
  if (session.status !== ORDER_SESSION_STATUS.collecting) {
    throw new Error('The order session is not collecting contributions.');
  }
  if (!isSessionContributionOpen(session, at)) {
    throw new Error('The order session deadline has passed.');
  }
};
