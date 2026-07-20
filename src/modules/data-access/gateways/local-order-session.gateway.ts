import { createId, nowIso } from '@/shared/helpers';

import type {
  CreateOrderSessionInput,
  OrderSessionService,
  TransitionOrderSessionInput,
  UpdateSessionContributionInput,
  UpdateSessionParticipantResponseInput,
} from '../contracts/order-session-service.interfaces';
import {
  ORDER_SESSION_STATUS,
  PARTICIPANT_IDENTITY_KIND,
  PARTICIPANT_RESPONSE,
  SESSION_PARTICIPANT_ROLE,
  type SessionParticipantRole,
} from '../enums';
import {
  assertSessionAcceptsContributions,
  createOrderSession,
  createSessionParticipant,
  markParticipantResponse,
  summarizeParticipantResponses,
  transitionOrderSession,
} from '../helpers/order-session.helper';
import {
  applySessionContributionMutation,
  calculateSessionExpectedGrandTotalMinor,
  computeSessionAggregate,
} from '../helpers/session-contribution.helper';
import { createSessionMenuSnapshot } from '../helpers/session-menu-snapshot.helper';
import type { BucketRole, SessionUser } from '../types/domain.types';
import type {
  OrderSession,
  OrderSessionView,
  SessionContributionMutationRecord,
  SessionParticipant,
} from '../types/order-session.types';
import {
  findBucketEntry,
  readDatabase,
  writeDatabase,
} from './local-database.helper';

const MUTATION_HISTORY_LIMIT = 1_000;

const toSessionRole = (role: BucketRole): SessionParticipantRole => {
  if (role === 'owner') return SESSION_PARTICIPANT_ROLE.organizer;
  if (role === 'editor') return SESSION_PARTICIPANT_ROLE.editor;
  if (role === 'viewer') return SESSION_PARTICIPANT_ROLE.viewer;
  return SESSION_PARTICIPANT_ROLE.participant;
};

const assertPositiveRevision = (value: number, label: string): void => {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
};

const findSessionParticipant = (
  participants: readonly SessionParticipant[],
  userId: string,
): SessionParticipant | null =>
  participants.find((participant) => participant.userId === userId) ?? null;

const assertSessionOrganizer = (
  session: OrderSession,
  user: SessionUser,
): void => {
  if (session.organizerId !== user.id) {
    throw new Error('Only the session organizer may change its lifecycle.');
  }
};

const assertExpectedSessionRevision = (
  session: OrderSession,
  expectedRevision: number,
): void => {
  assertPositiveRevision(expectedRevision, 'Expected session revision');
  if (session.revision !== expectedRevision) {
    throw new Error('The order session changed. Refresh and try again.');
  }
};

export class LocalOrderSessionService implements OrderSessionService {
  async listSessions(user: SessionUser): Promise<OrderSession[]> {
    const database = readDatabase();
    return structuredClone(
      Object.values(database.orderSessions.sessions)
        .filter((session) => {
          const participants =
            database.orderSessions.participants[session.id] ?? [];
          return (
            session.organizerId === user.id ||
            participants.some(
              (participant) =>
                participant.userId === user.id &&
                participant.response !== PARTICIPANT_RESPONSE.removed,
            )
          );
        })
        .toSorted((left, right) =>
          right.updatedAt.localeCompare(left.updatedAt),
        ),
    );
  }

  async createSession(
    user: SessionUser,
    input: CreateOrderSessionInput,
  ): Promise<OrderSession> {
    const database = readDatabase();
    const bucketEntry = findBucketEntry(database, input.menuTemplateId);
    if (!bucketEntry) throw new Error('Menu template was not found.');
    if (bucketEntry.bucket.ownerId !== user.id) {
      throw new Error('Only the menu owner may open an order session.');
    }
    const occurrenceKey = input.scheduleOccurrenceKey?.trim() || null;
    if (
      occurrenceKey &&
      Object.values(database.orderSessions.sessions).some(
        (session) => session.scheduleOccurrenceKey === occurrenceKey,
      )
    ) {
      throw new Error('This scheduled order session already exists.');
    }

    const at = nowIso();
    const snapshot = createSessionMenuSnapshot(bucketEntry.bucket);
    const draft = createOrderSession({
      id: createId('session'),
      menuTemplateId: bucketEntry.bucket.id,
      sourceMenuRevision: bucketEntry.bucket.revision,
      organizerId: user.id,
      workspaceId: input.workspaceId,
      title: input.title?.trim() || bucketEntry.bucket.title,
      currency: bucketEntry.bucket.currency,
      timezone: input.timezone,
      deadlineAt: input.deadlineAt,
      autoLock: input.autoLock,
      scheduleOccurrenceKey: occurrenceKey,
      menuItems: snapshot.menuItems,
      pricingPolicy: snapshot.pricingPolicy,
      createdAt: at,
    });
    const members = database.sharing.members[bucketEntry.bucket.id] ?? [];
    const activeMembers = members.filter((member) => member.status === 'active');
    const participantDrafts = [
      createSessionParticipant({
        userId: user.id,
        displayName: user.displayName,
        identityKind: PARTICIPANT_IDENTITY_KIND.account,
        role: SESSION_PARTICIPANT_ROLE.organizer,
        joinedAt: at,
      }),
      ...activeMembers
        .filter((member) => member.userId !== user.id)
        .map((member) =>
          createSessionParticipant({
            userId: member.userId,
            displayName: member.displayName,
            identityKind: PARTICIPANT_IDENTITY_KIND.account,
            role: toSessionRole(member.role),
            joinedAt: at,
          }),
        ),
    ];
    const collecting = transitionOrderSession(
      {
        ...draft,
        responseSummary: summarizeParticipantResponses(participantDrafts),
      },
      ORDER_SESSION_STATUS.collecting,
      user.id,
      at,
    );

    database.orderSessions.sessions[collecting.id] = collecting;
    database.orderSessions.participants[collecting.id] = participantDrafts;
    database.orderSessions.contributions[collecting.id] = [];
    database.orderSessions.mutations[collecting.id] = [];
    writeDatabase(database);
    return structuredClone(collecting);
  }

  async getSessionView(
    user: SessionUser,
    sessionId: string,
  ): Promise<OrderSessionView | null> {
    const database = readDatabase();
    const session = database.orderSessions.sessions[sessionId];
    if (!session) return null;
    const participants = database.orderSessions.participants[sessionId] ?? [];
    const currentParticipant = findSessionParticipant(participants, user.id);
    const hasAccess =
      session.organizerId === user.id ||
      (currentParticipant !== null &&
        currentParticipant.response !== PARTICIPANT_RESPONSE.removed);
    if (!hasAccess) return null;

    return structuredClone({
      session,
      participants,
      contributions: database.orderSessions.contributions[sessionId] ?? [],
      currentParticipant,
    });
  }

  async transitionSession(
    user: SessionUser,
    input: TransitionOrderSessionInput,
  ): Promise<OrderSession> {
    const database = readDatabase();
    const session = database.orderSessions.sessions[input.sessionId];
    if (!session) throw new Error('Order session was not found.');
    assertExpectedSessionRevision(session, input.expectedRevision);
    assertSessionOrganizer(session, user);
    const saved = transitionOrderSession(
      session,
      input.nextStatus,
      user.id,
      nowIso(),
    );
    database.orderSessions.sessions[input.sessionId] = saved;
    writeDatabase(database);
    return structuredClone(saved);
  }

  async updateParticipantResponse(
    user: SessionUser,
    input: UpdateSessionParticipantResponseInput,
  ): Promise<SessionParticipant> {
    assertPositiveRevision(
      input.expectedParticipantRevision,
      'Expected participant revision',
    );
    const database = readDatabase();
    const session = database.orderSessions.sessions[input.sessionId];
    if (!session) throw new Error('Order session was not found.');
    assertExpectedSessionRevision(session, input.expectedSessionRevision);
    const participants = database.orderSessions.participants[input.sessionId] ?? [];
    const index = participants.findIndex(
      (participant) => participant.userId === user.id,
    );
    const participant = index === -1 ? null : participants[index];
    if (!participant) {
      throw new Error('You are not a participant in this order session.');
    }
    if (participant.revision !== input.expectedParticipantRevision) {
      throw new Error('Your participant status changed. Refresh and try again.');
    }
    if (session.status !== ORDER_SESSION_STATUS.collecting) {
      throw new Error(
        'Participant responses can change only while the session is collecting.',
      );
    }

    const saved = markParticipantResponse(participant, input.response, nowIso());
    if (saved === participant) return structuredClone(participant);
    participants[index] = saved;
    database.orderSessions.participants[input.sessionId] = participants;
    database.orderSessions.sessions[input.sessionId] = {
      ...session,
      responseSummary: summarizeParticipantResponses(participants),
      revision: session.revision + 1,
      updatedAt: saved.updatedAt,
    };
    writeDatabase(database);
    return structuredClone(saved);
  }

  async updateContribution(
    user: SessionUser,
    input: UpdateSessionContributionInput,
  ): Promise<SessionContributionMutationRecord> {
    const database = readDatabase();
    const mutations = database.orderSessions.mutations[input.sessionId] ?? [];
    const appliedMutation =
      mutations.find((candidate) => candidate.id === input.mutationId) ?? null;
    if (appliedMutation) return structuredClone(appliedMutation);

    const session = database.orderSessions.sessions[input.sessionId];
    if (!session) throw new Error('Order session was not found.');
    assertExpectedSessionRevision(session, input.expectedSessionRevision);
    assertSessionAcceptsContributions(session);
    const participants = database.orderSessions.participants[input.sessionId] ?? [];
    const participantIndex = participants.findIndex(
      (participant) => participant.userId === user.id,
    );
    const participant =
      participantIndex === -1 ? null : participants[participantIndex];
    if (
      !participant ||
      participant.role === SESSION_PARTICIPANT_ROLE.viewer ||
      participant.response === PARTICIPANT_RESPONSE.removed
    ) {
      throw new Error('You do not have permission to contribute to this session.');
    }
    const item = session.menuItems.find(
      (candidate) => candidate.id === input.itemId,
    );
    if (!item?.active) throw new Error('This item is not available.');

    const contributions =
      database.orderSessions.contributions[input.sessionId] ?? [];
    const currentContribution =
      contributions.find((candidate) => candidate.userId === user.id) ?? null;
    const result = applySessionContributionMutation(
      { contribution: currentContribution, appliedMutation: null },
      {
        mutationId: input.mutationId,
        sessionId: input.sessionId,
        userId: user.id,
        displayName: user.displayName,
        itemId: input.itemId,
        operation: input.operation,
        value: input.value,
        occurredAt: nowIso(),
      },
    );
    const updatedContributions = [
      ...contributions.filter((candidate) => candidate.userId !== user.id),
      result.contribution,
    ];
    database.orderSessions.contributions[input.sessionId] = updatedContributions;
    database.orderSessions.mutations[input.sessionId] = [
      result.record,
      ...mutations,
    ].slice(0, MUTATION_HISTORY_LIMIT);
    if (participant.response !== PARTICIPANT_RESPONSE.ordering) {
      participants[participantIndex] = markParticipantResponse(
        participant,
        PARTICIPANT_RESPONSE.ordering,
        result.record.createdAt,
      );
    }
    const aggregate = computeSessionAggregate(updatedContributions);
    const expectedGrandTotalMinor = calculateSessionExpectedGrandTotalMinor(
      session,
      aggregate,
    );
    database.orderSessions.participants[input.sessionId] = participants;
    database.orderSessions.sessions[input.sessionId] = {
      ...session,
      aggregate,
      responseSummary: summarizeParticipantResponses(participants),
      revision: session.revision + 1,
      updatedAt: result.record.createdAt,
      settlementSummary: {
        ...session.settlementSummary,
        participantCount: updatedContributions.filter(
          (contribution) => Object.keys(contribution.quantities).length > 0,
        ).length,
        expectedGrandTotalMinor,
        outstandingGrandTotalMinor: Math.max(
          0,
          expectedGrandTotalMinor - session.settlementSummary.verifiedGrandTotalMinor,
        ),
      },
    };
    writeDatabase(database);
    return structuredClone(result.record);
  }
}
