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
} from '../enums/order-session.enums';
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
  computeSessionAggregate,
} from '../helpers/session-contribution.helper';
import type { BucketRole, SessionUser } from '../types/domain.types';
import type {
  OrderSession,
  OrderSessionView,
  SessionContributionMutationRecord,
  SessionParticipant,
  SessionParticipantRole,
} from '../types/order-session.types';
import {
  findBucketEntry,
  readDatabase,
  writeDatabase,
} from './local-database.helper';

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

const sessionParticipant = (
  participants: readonly SessionParticipant[],
  userId: string,
): SessionParticipant | null =>
  participants.find((participant) => participant.userId === userId) ?? null;

const assertSessionManager = (
  session: OrderSession,
  participant: SessionParticipant | null,
  user: SessionUser,
): void => {
  const canManage =
    session.organizerId === user.id ||
    participant?.role === SESSION_PARTICIPANT_ROLE.editor;
  if (!canManage) throw new Error('You do not have permission for this action.');
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
        .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
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
    const currentParticipant = sessionParticipant(participants, user.id);
    if (session.organizerId !== user.id && !currentParticipant) return null;

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
    assertPositiveRevision(input.expectedRevision, 'Expected session revision');
    const database = readDatabase();
    const session = database.orderSessions.sessions[input.sessionId];
    if (!session) throw new Error('Order session was not found.');
    if (session.revision !== input.expectedRevision) {
      throw new Error('The order session changed. Refresh and try again.');
    }
    const participants = database.orderSessions.participants[input.sessionId] ?? [];
    assertSessionManager(
      session,
      sessionParticipant(participants, user.id),
      user,
    );
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
    const participants = database.orderSessions.participants[input.sessionId] ?? [];
    const index = participants.findIndex(
      (participant) => participant.userId === user.id,
    );
    const participant = index === -1 ? null : participants[index];
    if (!participant) throw new Error('You are not a participant in this order session.');
    if (participant.revision !== input.expectedParticipantRevision) {
      throw new Error('Your participant status changed. Refresh and try again.');
    }
    if (
      session.status !== ORDER_SESSION_STATUS.collecting &&
      input.response !== PARTICIPANT_RESPONSE.removed
    ) {
      throw new Error('Participant responses can change only while the session is collecting.');
    }

    const saved = markParticipantResponse(participant, input.response, nowIso());
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
    const session = database.orderSessions.sessions[input.sessionId];
    if (!session) throw new Error('Order session was not found.');
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
    const bucketEntry = findBucketEntry(database, session.menuTemplateId);
    const item = bucketEntry?.bucket.items.find(
      (candidate) => candidate.id === input.itemId,
    );
    if (!item?.active) throw new Error('This item is not available.');

    const contributions = database.orderSessions.contributions[input.sessionId] ?? [];
    const mutations = database.orderSessions.mutations[input.sessionId] ?? [];
    const currentContribution =
      contributions.find((candidate) => candidate.userId === user.id) ?? null;
    const appliedMutation =
      mutations.find((candidate) => candidate.id === input.mutationId) ?? null;
    const result = applySessionContributionMutation(
      { contribution: currentContribution, appliedMutation },
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
    if (result.alreadyApplied) return structuredClone(result.record);

    database.orderSessions.contributions[input.sessionId] = [
      ...contributions.filter((candidate) => candidate.userId !== user.id),
      result.contribution,
    ];
    database.orderSessions.mutations[input.sessionId] = [
      result.record,
      ...mutations,
    ].slice(0, 1_000);
    if (
      participant.response === PARTICIPANT_RESPONSE.pending ||
      participant.response === PARTICIPANT_RESPONSE.viewed ||
      participant.response === PARTICIPANT_RESPONSE.done ||
      participant.response === PARTICIPANT_RESPONSE.skipped
    ) {
      participants[participantIndex] = markParticipantResponse(
        participant,
        PARTICIPANT_RESPONSE.ordering,
        result.record.createdAt,
      );
    }
    const updatedParticipants = participants;
    const updatedContributions =
      database.orderSessions.contributions[input.sessionId] ?? [];
    database.orderSessions.participants[input.sessionId] = updatedParticipants;
    database.orderSessions.sessions[input.sessionId] = {
      ...session,
      responseSummary: summarizeParticipantResponses(updatedParticipants),
      revision: session.revision + 1,
      updatedAt: result.record.createdAt,
      settlementSummary: {
        ...session.settlementSummary,
        participantCount: updatedContributions.filter(
          (contribution) => Object.keys(contribution.quantities).length > 0,
        ).length,
      },
    };
    computeSessionAggregate(updatedContributions);
    writeDatabase(database);
    return structuredClone(result.record);
  }
}
