import { readWebStorage, writeWebStorage } from '@/platform/storage';
import { nowIso } from '@/shared/helpers';

import type { SessionInviteService } from '../contracts/session-invite-service.interfaces';
import {
  PARTICIPANT_IDENTITY_KIND,
  PARTICIPANT_RESPONSE,
  SESSION_PARTICIPANT_ROLE,
} from '../enums/order-session.enums';
import {
  markParticipantResponse,
  summarizeParticipantResponses,
} from '../helpers/order-session.helper';
import {
  applySessionContributionMutation,
  calculateSessionExpectedGrandTotalMinor,
  computeSessionAggregate,
} from '../helpers/session-contribution.helper';
import {
  consumeSessionInvite,
  createGuestCapability,
  createSessionInvite,
  isSessionInviteUsable,
  linkGuestCapability,
  parseSessionShareCode,
  revokeSessionInvite,
  validatePublicSessionInvitePreview,
  verifyGuestCapability,
} from '../helpers/session-invite.helper';
import { hashInviteToken } from '../helpers/sharing.helper';
import type { SessionUser } from '../types/domain.types';
import type { SessionContribution } from '../types/order-session.types';
import type {
  CreateSessionInviteResult,
  GuestAccountLinkResult,
  GuestContributionInput,
  GuestContributionResult,
  GuestResponseInput,
  GuestSessionCapability,
  GuestSessionView,
  PublicSessionInvitePreview,
  SessionInvite,
  StoredGuestSessionCapability,
} from '../types/session-invite.types';
import { readDatabase, writeDatabase } from './local-database.helper';

interface LocalSessionInviteStore {
  invites: Record<string, SessionInvite[]>;
  guests: Record<string, StoredGuestSessionCapability>;
}

const STORE_KEY = 'foodorder:v1:session-invite-store';
const MAX_SESSION_PARTICIPANTS = 20;
const MUTATION_HISTORY_LIMIT = 1_000;

const emptyStore = (): LocalSessionInviteStore => ({ invites: {}, guests: {} });

const readStore = (): LocalSessionInviteStore => {
  try {
    const parsed = JSON.parse(
      readWebStorage(STORE_KEY) ?? '',
    ) as Partial<LocalSessionInviteStore>;
    return {
      invites: parsed.invites ?? {},
      guests: parsed.guests ?? {},
    };
  } catch {
    return emptyStore();
  }
};

const writeStore = (store: LocalSessionInviteStore): void => {
  writeWebStorage(STORE_KEY, JSON.stringify(store));
};

const requireSession = (sessionId: string) => {
  const database = readDatabase();
  const session = database.orderSessions.sessions[sessionId];
  if (!session) throw new Error('Order session was not found.');
  return { database, session };
};

const requireOrganizer = (user: SessionUser, sessionId: string) => {
  const result = requireSession(sessionId);
  if (result.session.organizerId !== user.id) {
    throw new Error('Only the session organizer may manage invitations.');
  }
  return result;
};

const inviteFromShareCode = async (
  shareCode: string,
): Promise<{
  store: LocalSessionInviteStore;
  invite: SessionInvite;
}> => {
  const parsed = parseSessionShareCode(shareCode);
  if (!parsed) throw new Error('This invitation is not valid.');
  const tokenHash = await hashInviteToken(parsed.rawToken);
  const store = readStore();
  const invite = (store.invites[parsed.sessionId] ?? []).find(
    (candidate) => candidate.id === tokenHash,
  );
  if (!invite || !isSessionInviteUsable(invite)) {
    throw new Error('This invitation is no longer available.');
  }
  return { store, invite };
};

const publicPreview = (sessionId: string): PublicSessionInvitePreview => {
  const { database, session } = requireSession(sessionId);
  const organizer = (database.orderSessions.participants[sessionId] ?? []).find(
    (participant) => participant.userId === session.organizerId,
  );
  return validatePublicSessionInvitePreview({
    sessionId,
    title: session.title,
    organizerDisplayName: organizer?.displayName ?? 'Organizer',
    deadlineAt: session.deadlineAt,
    currency: session.currency,
    activeItemCount: session.menuItems.filter((item) => item.active).length,
    participantCount: session.responseSummary.total,
    isCollecting: session.status === 'collecting',
  });
};

const requireGuest = async (
  capability: Pick<
    GuestSessionCapability,
    'sessionId' | 'guestId' | 'guestSecret'
  >,
): Promise<StoredGuestSessionCapability> => {
  const stored = readStore().guests[capability.guestId];
  if (
    !stored ||
    stored.sessionId !== capability.sessionId ||
    !(await verifyGuestCapability(stored, capability.guestSecret))
  ) {
    throw new Error('Guest access is invalid or expired.');
  }
  return stored;
};

const buildGuestView = async (
  capability: GuestSessionCapability,
): Promise<GuestSessionView> => {
  await requireGuest(capability);
  const { database, session } = requireSession(capability.sessionId);
  const participant = (
    database.orderSessions.participants[session.id] ?? []
  ).find((candidate) => candidate.userId === capability.guestId);
  if (!participant) throw new Error('Guest participant was not found.');
  const contribution = (
    database.orderSessions.contributions[session.id] ?? []
  ).find((candidate) => candidate.userId === capability.guestId);
  const personalSubtotalMinor = session.menuItems.reduce(
    (total, item) =>
      total + item.unitPriceMinor * (contribution?.quantities[item.id] ?? 0),
    0,
  );
  return {
    preview: publicPreview(session.id),
    participantResponse: participant.response,
    participantRevision: participant.revision,
    sessionRevision: session.revision,
    quantities: contribution?.quantities ?? {},
    menuItems: session.menuItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      unitPriceMinor: item.unitPriceMinor,
      active: item.active,
      sortOrder: item.sortOrder,
    })),
    personalSubtotalMinor,
    personalFinalTotalMinor: null,
    paymentStatus: null,
  };
};

export class LocalSessionInviteService implements SessionInviteService {
  async createInvite(
    user: SessionUser,
    sessionId: string,
    maxUses?: number,
  ): Promise<CreateSessionInviteResult> {
    requireOrganizer(user, sessionId);
    const created = await createSessionInvite({
      sessionId,
      createdBy: user.id,
      maxUses,
    });
    const store = readStore();
    store.invites[sessionId] = [
      created.invite,
      ...(store.invites[sessionId] ?? []),
    ];
    writeStore(store);
    return structuredClone(created);
  }

  async listInvites(user: SessionUser, sessionId: string): Promise<SessionInvite[]> {
    requireOrganizer(user, sessionId);
    return structuredClone(
      (readStore().invites[sessionId] ?? []).toSorted((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      ),
    );
  }

  async revokeInvite(
    user: SessionUser,
    sessionId: string,
    inviteId: string,
  ): Promise<SessionInvite> {
    requireOrganizer(user, sessionId);
    const store = readStore();
    const invites = store.invites[sessionId] ?? [];
    const index = invites.findIndex((invite) => invite.id === inviteId);
    const invite = invites[index];
    if (index === -1 || !invite) throw new Error('Invitation was not found.');
    const saved = revokeSessionInvite(invite);
    invites[index] = saved;
    store.invites[sessionId] = invites;
    writeStore(store);
    return structuredClone(saved);
  }

  async previewInvite(shareCode: string): Promise<PublicSessionInvitePreview> {
    const { invite } = await inviteFromShareCode(shareCode);
    return structuredClone(publicPreview(invite.sessionId));
  }

  async joinAsGuest(
    shareCode: string,
    displayName: string,
  ): Promise<GuestSessionCapability> {
    const { store, invite } = await inviteFromShareCode(shareCode);
    const { database, session } = requireSession(invite.sessionId);
    const participants = database.orderSessions.participants[session.id] ?? [];
    if (participants.length >= MAX_SESSION_PARTICIPANTS) {
      throw new Error('This order session has reached its participant limit.');
    }
    const created = await createGuestCapability({
      sessionId: session.id,
      displayName,
    });
    const timestamp = created.storedCapability.createdAt;
    participants.push({
      userId: created.storedCapability.guestId,
      displayName: created.storedCapability.displayName,
      identityKind: PARTICIPANT_IDENTITY_KIND.guest,
      role: SESSION_PARTICIPANT_ROLE.participant,
      response: PARTICIPANT_RESPONSE.viewed,
      includeInFinalOrder: false,
      firstViewedAt: timestamp,
      completedAt: null,
      skippedAt: null,
      removedAt: null,
      lastActivityAt: timestamp,
      reminderCount: 0,
      lastReminderAt: null,
      revision: 1,
      joinedAt: timestamp,
      updatedAt: timestamp,
    });
    database.orderSessions.participants[session.id] = participants;
    database.orderSessions.sessions[session.id] = {
      ...session,
      responseSummary: summarizeParticipantResponses(participants),
      revision: session.revision + 1,
      updatedAt: timestamp,
    };
    const invites = store.invites[session.id] ?? [];
    store.invites[session.id] = invites.map((candidate) =>
      candidate.id === invite.id ? consumeSessionInvite(candidate, timestamp) : candidate,
    );
    store.guests[created.storedCapability.guestId] = created.storedCapability;
    writeDatabase(database);
    writeStore(store);
    return structuredClone(created.publicCapability);
  }

  async getGuestSessionView(
    capability: GuestSessionCapability,
  ): Promise<GuestSessionView> {
    return structuredClone(await buildGuestView(capability));
  }

  async updateGuestContribution(
    input: GuestContributionInput,
  ): Promise<GuestContributionResult> {
    const stored = await requireGuest(input);
    const { database, session } = requireSession(input.sessionId);
    const mutations = database.orderSessions.mutations[session.id] ?? [];
    const replay = mutations.find((candidate) => candidate.id === input.mutationId);
    if (replay) {
      return { mutation: structuredClone(replay), sessionRevision: session.revision };
    }
    if (session.revision !== input.expectedSessionRevision) {
      throw new Error('The order session changed. Refresh and try again.');
    }
    if (
      session.status !== 'collecting' ||
      (session.deadlineAt && Date.now() >= Date.parse(session.deadlineAt))
    ) {
      throw new Error('The order session is not collecting contributions.');
    }
    const item = session.menuItems.find((candidate) => candidate.id === input.itemId);
    if (!item?.active) throw new Error('This item is not available.');
    const participants = database.orderSessions.participants[session.id] ?? [];
    const participantIndex = participants.findIndex(
      (participant) => participant.userId === stored.guestId,
    );
    const participant = participants[participantIndex];
    if (participantIndex === -1 || !participant) {
      throw new Error('Guest participant was not found.');
    }
    const contributions = database.orderSessions.contributions[session.id] ?? [];
    const current =
      contributions.find((candidate) => candidate.userId === stored.guestId) ?? null;
    const result = applySessionContributionMutation(
      { contribution: current, appliedMutation: null },
      {
        mutationId: input.mutationId,
        sessionId: session.id,
        userId: stored.guestId,
        displayName: stored.displayName,
        itemId: input.itemId,
        operation: input.operation,
        value: input.value,
        occurredAt: nowIso(),
      },
    );
    const updatedContributions: SessionContribution[] = [
      ...contributions.filter(
        (contribution) => contribution.userId !== stored.guestId,
      ),
      result.contribution,
    ];
    participants[participantIndex] = markParticipantResponse(
      participant,
      PARTICIPANT_RESPONSE.ordering,
      result.record.createdAt,
    );
    const aggregate = computeSessionAggregate(updatedContributions);
    const expectedGrandTotalMinor = calculateSessionExpectedGrandTotalMinor(
      session,
      aggregate,
    );
    database.orderSessions.contributions[session.id] = updatedContributions;
    database.orderSessions.mutations[session.id] = [
      result.record,
      ...mutations,
    ].slice(0, MUTATION_HISTORY_LIMIT);
    database.orderSessions.participants[session.id] = participants;
    database.orderSessions.sessions[session.id] = {
      ...session,
      aggregate,
      responseSummary: summarizeParticipantResponses(participants),
      settlementSummary: {
        ...session.settlementSummary,
        participantCount: updatedContributions.filter(
          (contribution) => Object.keys(contribution.quantities).length > 0,
        ).length,
        expectedGrandTotalMinor,
        outstandingGrandTotalMinor: expectedGrandTotalMinor,
      },
      revision: session.revision + 1,
      updatedAt: result.record.createdAt,
    };
    writeDatabase(database);
    return {
      mutation: structuredClone(result.record),
      sessionRevision: session.revision + 1,
    };
  }

  async updateGuestResponse(input: GuestResponseInput): Promise<GuestSessionView> {
    const stored = await requireGuest(input);
    const { database, session } = requireSession(input.sessionId);
    if (session.revision !== input.expectedSessionRevision) {
      throw new Error('The order session changed. Refresh and try again.');
    }
    if (session.status !== 'collecting') {
      throw new Error('Participant responses are closed.');
    }
    const participants = database.orderSessions.participants[session.id] ?? [];
    const index = participants.findIndex(
      (participant) => participant.userId === stored.guestId,
    );
    const participant = participants[index];
    if (index === -1 || !participant) throw new Error('Guest participant was not found.');
    if (participant.revision !== input.expectedParticipantRevision) {
      throw new Error('Your participant status changed. Refresh and try again.');
    }
    const saved = markParticipantResponse(participant, input.response, nowIso());
    participants[index] = saved;
    database.orderSessions.participants[session.id] = participants;
    database.orderSessions.sessions[session.id] = {
      ...session,
      responseSummary: summarizeParticipantResponses(participants),
      revision: session.revision + 1,
      updatedAt: saved.updatedAt,
    };
    writeDatabase(database);
    return structuredClone(await buildGuestView({
      sessionId: stored.sessionId,
      guestId: stored.guestId,
      guestSecret: input.guestSecret,
      expiresAt: stored.expiresAt,
      displayName: stored.displayName,
    }));
  }

  async linkGuestToAccount(
    user: SessionUser,
    capability: GuestSessionCapability,
  ): Promise<GuestAccountLinkResult> {
    const stored = await requireGuest(capability);
    const { database, session } = requireSession(capability.sessionId);
    const participants = database.orderSessions.participants[session.id] ?? [];
    const guestIndex = participants.findIndex(
      (participant) => participant.userId === stored.guestId,
    );
    const guestParticipant = participants[guestIndex];
    if (guestIndex === -1 || !guestParticipant) {
      throw new Error('Guest participant was not found.');
    }
    const existingAccount = participants.find(
      (participant) => participant.userId === user.id,
    );
    if (existingAccount && existingAccount.userId !== stored.guestId) {
      throw new Error('This account already participates in the order session.');
    }
    const timestamp = nowIso();
    participants[guestIndex] = {
      ...guestParticipant,
      userId: user.id,
      displayName: user.displayName,
      identityKind: PARTICIPANT_IDENTITY_KIND.account,
      updatedAt: timestamp,
      lastActivityAt: timestamp,
      revision: guestParticipant.revision + 1,
    };
    const contributions = database.orderSessions.contributions[session.id] ?? [];
    const hasGuestContribution = contributions.some(
      (contribution) => contribution.userId === stored.guestId,
    );
    database.orderSessions.contributions[session.id] = contributions.map(
      (contribution) =>
        contribution.userId === stored.guestId
          ? {
              ...contribution,
              userId: user.id,
              displayName: user.displayName,
              revision: contribution.revision + 1,
              updatedAt: timestamp,
            }
          : contribution,
    );
    database.orderSessions.participants[session.id] = participants;
    database.orderSessions.sessions[session.id] = {
      ...session,
      participantIds: undefined,
      responseSummary: summarizeParticipantResponses(participants),
      revision: session.revision + 1,
      updatedAt: timestamp,
    } as typeof session;
    const store = readStore();
    store.guests[stored.guestId] = linkGuestCapability(stored, user.id, timestamp);
    writeDatabase(database);
    writeStore(store);
    return {
      sessionId: session.id,
      guestId: stored.guestId,
      userId: user.id,
      linkedAt: timestamp,
      transferredMutationCount: hasGuestContribution ? 1 : 0,
    };
  }
}
