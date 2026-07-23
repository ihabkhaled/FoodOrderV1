import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const REGION = 'europe-west1';
const TOKEN_BYTES = 18;
const INVITE_EXPIRY_MILLIS = 72 * 60 * 60 * 1_000;
const GUEST_EXPIRY_MILLIS = 30 * 24 * 60 * 60 * 1_000;
const MAX_SESSION_PARTICIPANTS = 20;
const MAX_INVITE_USES = 100;
const DEFAULT_INVITE_USES = 20;
const MAX_QUANTITY = 999;
const SHARE_SEPARATOR = '.';

interface OrderSessionRecord {
  id: string;
  organizerId: string;
  participantIds: string[];
  title: string;
  currency: string;
  status: string;
  deadlineAt: string | null;
  menuItems: {
    id: string;
    name: string;
    description: string;
    category: string;
    unitPriceMinor: number;
    active: boolean;
    sortOrder: number;
  }[];
  pricingPolicy: {
    vatBasisPoints: number;
    serviceBasisPoints: number;
    deliveryMinor: number;
  };
  aggregate: Record<string, number>;
  responseSummary: {
    pending: number;
    viewed: number;
    ordering: number;
    done: number;
    skipped: number;
    removed: number;
    eligibleForFinalization: number;
    total: number;
  };
  settlementSummary: {
    participantCount: number;
    expectedGrandTotalMinor: number;
    outstandingGrandTotalMinor: number;
    verifiedGrandTotalMinor: number;
    settledParticipantCount: number;
  };
  revision: number;
  updatedAt: string;
}

interface SessionInviteRecord {
  id: string;
  sessionId: string;
  status: 'pending' | 'revoked' | 'exhausted' | 'expired';
  createdBy: string;
  expiresAt: string;
  expiresAtMillis: number;
  maxUses: number;
  usedCount: number;
  createdAt: string;
  revokedAt: string | null;
}

interface GuestIdentityRecord {
  sessionId: string;
  guestId: string;
  expiresAt: string;
  expiresAtMillis: number;
  displayName: string;
  secretHash: string;
  status: 'active' | 'revoked' | 'linked' | 'expired';
  linkedUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SessionParticipantRecord {
  userId: string;
  displayName: string;
  identityKind: 'account' | 'guest';
  role: 'organizer' | 'editor' | 'participant' | 'viewer';
  response: 'pending' | 'viewed' | 'ordering' | 'done' | 'skipped' | 'removed';
  includeInFinalOrder: boolean;
  firstViewedAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  removedAt: string | null;
  lastActivityAt: string;
  reminderCount: number;
  lastReminderAt: string | null;
  revision: number;
  joinedAt: string;
  updatedAt: string;
}

interface SessionContributionRecord {
  sessionId: string;
  userId: string;
  displayName: string;
  quantities: Record<string, number>;
  revision: number;
  lastMutationId: string;
  updatedAt: string;
}

type ContributionOperation = 'set' | 'increment';

interface SessionMutationRecord {
  id: string;
  sessionId: string;
  userId: string;
  itemId: string;
  operation: ContributionOperation;
  requestedValue: number;
  appliedDelta: number;
  resultQuantity: number;
  resultRevision: number;
  createdAt: string;
}

const firestore = getFirestore();

const dataOf = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};

const requireAuth = (auth: { uid: string } | undefined): string => {
  if (!auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
  return auth.uid;
};

const requiredString = (
  value: unknown,
  label: string,
  maximumLength = 160,
): string => {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${label} must be text.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maximumLength) {
    throw new HttpsError(
      'invalid-argument',
      `${label} must contain between 1 and ${maximumLength} characters.`,
    );
  }
  return normalized;
};

const requiredRevision = (value: unknown, label: string): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new HttpsError('invalid-argument', `${label} must be a positive integer.`);
  }
  return value as number;
};

const requiredContributionOperation = (value: unknown): ContributionOperation => {
  if (value !== 'set' && value !== 'increment') {
    throw new HttpsError('invalid-argument', 'Contribution operation is invalid.');
  }
  return value;
};

const requiredContributionValue = (value: unknown): number => {
  if (!Number.isSafeInteger(value)) {
    throw new HttpsError('invalid-argument', 'Contribution value must be an integer.');
  }
  return value as number;
};

const updatedQuantities = (
  current: Readonly<Record<string, number>> | undefined,
  itemId: string,
  target: number,
): Record<string, number> => {
  const entries = Object.entries(current ?? {}).filter(
    ([candidateItemId]) => candidateItemId !== itemId,
  );
  if (target > 0) entries.push([itemId, target]);
  return Object.fromEntries(entries);
};

const assertGuestContributionAccess = (
  guest: GuestIdentityRecord,
  guestSecret: string,
  session: OrderSessionRecord,
  expectedSessionRevision: number,
): void => {
  if (!guestUsable(guest, guestSecret)) {
    throw new HttpsError('permission-denied', 'Guest access is invalid or expired.');
  }
  if (session.revision !== expectedSessionRevision) {
    throw new HttpsError('aborted', 'The order session changed. Refresh and try again.');
  }
  if (
    session.status !== 'collecting' ||
    (session.deadlineAt && Date.now() >= Date.parse(session.deadlineAt))
  ) {
    throw new HttpsError(
      'failed-precondition',
      'The order session is not collecting contributions.',
    );
  }
};

const requiredTargetQuantity = (
  currentQuantity: number,
  operation: ContributionOperation,
  value: number,
): number => {
  const target = operation === 'set' ? value : currentQuantity + value;
  if (!Number.isSafeInteger(target) || target < 0 || target > MAX_QUANTITY) {
    throw new HttpsError(
      'invalid-argument',
      `Quantity must be between 0 and ${MAX_QUANTITY}.`,
    );
  }
  return target;
};

const randomToken = (): string => randomBytes(TOKEN_BYTES).toString('hex');
const hashSecret = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

const parseShareCode = (
  value: unknown,
): { sessionId: string; rawToken: string } => {
  const shareCode = requiredString(value, 'Invitation code', 256);
  const separator = shareCode.lastIndexOf(SHARE_SEPARATOR);
  if (separator <= 0 || separator === shareCode.length - 1) {
    throw new HttpsError('not-found', 'This invitation is not available.');
  }
  const sessionId = shareCode.slice(0, separator);
  const rawToken = shareCode.slice(separator + 1);
  if (!/^[a-f0-9]{36}$/iu.test(rawToken)) {
    throw new HttpsError('not-found', 'This invitation is not available.');
  }
  return { sessionId, rawToken };
};

const invitationUsable = (invite: SessionInviteRecord): boolean =>
  invite.status === 'pending' &&
  invite.expiresAtMillis > Date.now() &&
  invite.usedCount < invite.maxUses;

const guestUsable = (
  guest: GuestIdentityRecord,
  rawSecret: string,
): boolean =>
  guest.status === 'active' &&
  guest.expiresAtMillis > Date.now() &&
  guest.secretHash === hashSecret(rawSecret);

const publicPreview = (session: OrderSessionRecord, organizerName: string) => ({
  sessionId: session.id,
  title: session.title,
  organizerDisplayName: organizerName,
  deadlineAt: session.deadlineAt,
  currency: session.currency,
  activeItemCount: session.menuItems.filter((item) => item.active).length,
  participantCount: session.responseSummary.total,
  isCollecting:
    session.status === 'collecting' &&
    (!session.deadlineAt || Date.now() < Date.parse(session.deadlineAt)),
});

const responseSummaryAfterGuestJoin = (session: OrderSessionRecord) => ({
  ...session.responseSummary,
  viewed: session.responseSummary.viewed + 1,
  total: session.responseSummary.total + 1,
});

const responseSummaryAfterChange = (
  session: OrderSessionRecord,
  from: SessionParticipantRecord['response'],
  to: SessionParticipantRecord['response'],
) => {
  if (from === to) return session.responseSummary;
  const summary = { ...session.responseSummary };
  summary[from] = Math.max(0, summary[from] - 1);
  summary[to] += 1;
  summary.eligibleForFinalization +=
    to === 'done' ? 1 : from === 'done' ? -1 : 0;
  return summary;
};

const markResponse = (
  participant: SessionParticipantRecord,
  response: 'ordering' | 'done' | 'skipped',
  timestamp: string,
): SessionParticipantRecord => ({
  ...participant,
  response,
  includeInFinalOrder: response === 'ordering' || response === 'done',
  firstViewedAt: participant.firstViewedAt ?? timestamp,
  completedAt: response === 'done' ? timestamp : null,
  skippedAt: response === 'skipped' ? timestamp : null,
  lastActivityAt: timestamp,
  revision: participant.revision + 1,
  updatedAt: timestamp,
});

const computeAggregate = (
  contributions: readonly SessionContributionRecord[],
): Record<string, number> => {
  const aggregate: Record<string, number> = {};
  for (const contribution of contributions) {
    for (const [itemId, quantity] of Object.entries(contribution.quantities)) {
      if (quantity > 0) aggregate[itemId] = (aggregate[itemId] ?? 0) + quantity;
    }
  }
  return aggregate;
};

const expectedTotal = (
  session: OrderSessionRecord,
  aggregate: Readonly<Record<string, number>>,
): number => {
  const subtotal = session.menuItems.reduce((total, item) => {
    const quantity = aggregate[item.id] ?? 0;
    const line = item.unitPriceMinor * quantity;
    if (!Number.isSafeInteger(line)) {
      throw new HttpsError('failed-precondition', 'The order amount is unsupported.');
    }
    return total + line;
  }, 0);
  const vat = Math.round(
    (subtotal * session.pricingPolicy.vatBasisPoints) / 10_000,
  );
  const service = Math.round(
    (subtotal * session.pricingPolicy.serviceBasisPoints) / 10_000,
  );
  const total = subtotal + vat + service + session.pricingPolicy.deliveryMinor;
  if (!Number.isSafeInteger(total)) {
    throw new HttpsError('failed-precondition', 'The order amount is unsupported.');
  }
  return total;
};

const personalSubtotal = (
  session: OrderSessionRecord,
  contribution: SessionContributionRecord | null,
): number =>
  session.menuItems.reduce(
    (total, item) =>
      total + item.unitPriceMinor * (contribution?.quantities[item.id] ?? 0),
    0,
  );

const activity = (
  sessionId: string,
  actorId: string,
  actorDisplayName: string,
  type: string,
  timestamp: string,
  metadata: Record<string, string> = {},
) => ({
  id: randomUUID(),
  sessionId,
  actorId,
  actorDisplayName,
  type,
  metadata,
  createdAt: timestamp,
});

const sessionReference = (sessionId: string) =>
  firestore.collection('orderSessions').doc(sessionId);

const requireOrganizer = async (userId: string, sessionId: string) => {
  const reference = sessionReference(sessionId);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Order session was not found.');
  const session = snapshot.data() as OrderSessionRecord;
  if (session.organizerId !== userId) {
    throw new HttpsError(
      'permission-denied',
      'Only the session organizer may manage invitations.',
    );
  }
  return { reference, session };
};

const requireGuest = async (
  sessionId: string,
  guestId: string,
  guestSecret: string,
) => {
  const reference = sessionReference(sessionId)
    .collection('guestIdentities')
    .doc(guestId);
  const snapshot = await reference.get();
  if (!snapshot.exists) {
    throw new HttpsError('permission-denied', 'Guest access is invalid or expired.');
  }
  const guest = snapshot.data() as GuestIdentityRecord;
  if (guest.sessionId !== sessionId || !guestUsable(guest, guestSecret)) {
    throw new HttpsError('permission-denied', 'Guest access is invalid or expired.');
  }
  return { reference, guest };
};

const guestView = async (
  sessionId: string,
  guestId: string,
  guestSecret: string,
) => {
  await requireGuest(sessionId, guestId, guestSecret);
  const reference = sessionReference(sessionId);
  const [sessionSnapshot, participantSnapshot, contributionSnapshot] =
    await Promise.all([
      reference.get(),
      reference.collection('participants').doc(guestId).get(),
      reference.collection('contributions').doc(guestId).get(),
    ]);
  if (!sessionSnapshot.exists || !participantSnapshot.exists) {
    throw new HttpsError('not-found', 'Guest order data was not found.');
  }
  const session = sessionSnapshot.data() as OrderSessionRecord;
  const participant = participantSnapshot.data() as SessionParticipantRecord;
  const contribution = contributionSnapshot.exists
    ? (contributionSnapshot.data() as SessionContributionRecord)
    : null;
  const organizerSnapshot = await reference
    .collection('participants')
    .doc(session.organizerId)
    .get();
  const organizerName = organizerSnapshot.exists
    ? (organizerSnapshot.data() as SessionParticipantRecord).displayName
    : 'Organizer';
  return {
    preview: publicPreview(session, organizerName),
    participantResponse: participant.response,
    participantRevision: participant.revision,
    sessionRevision: session.revision,
    quantities: contribution?.quantities ?? {},
    menuItems: session.menuItems,
    personalSubtotalMinor: personalSubtotal(session, contribution),
    personalFinalTotalMinor: null,
    paymentStatus: null,
  };
};

export const createSessionInviteV170 = onCall({ region: REGION }, async (request) => {
  const userId = requireAuth(request.auth);
  const data = dataOf(request.data);
  const sessionId = requiredString(data.sessionId, 'Session ID');
  const maxUses =
    data.maxUses === undefined
      ? DEFAULT_INVITE_USES
      : requiredRevision(data.maxUses, 'Maximum uses');
  if (maxUses > MAX_INVITE_USES) {
    throw new HttpsError(
      'invalid-argument',
      `Maximum uses cannot exceed ${MAX_INVITE_USES}.`,
    );
  }
  const { reference } = await requireOrganizer(userId, sessionId);
  const rawToken = randomToken();
  const tokenHash = hashSecret(rawToken);
  const timestamp = new Date().toISOString();
  const expiresAtMillis = Date.now() + INVITE_EXPIRY_MILLIS;
  const invite: SessionInviteRecord = {
    id: tokenHash,
    sessionId,
    status: 'pending',
    createdBy: userId,
    expiresAt: new Date(expiresAtMillis).toISOString(),
    expiresAtMillis,
    maxUses,
    usedCount: 0,
    createdAt: timestamp,
    revokedAt: null,
  };
  await reference.collection('invites').doc(tokenHash).create(invite);
  return { invite, shareCode: `${sessionId}${SHARE_SEPARATOR}${rawToken}` };
});

export const listSessionInvitesV170 = onCall({ region: REGION }, async (request) => {
  const userId = requireAuth(request.auth);
  const sessionId = requiredString(dataOf(request.data).sessionId, 'Session ID');
  const { reference } = await requireOrganizer(userId, sessionId);
  const snapshot = await reference.collection('invites').limit(100).get();
  return snapshot.docs
    .map((documentSnapshot) => documentSnapshot.data() as SessionInviteRecord)
    .toSorted((left, right) => right.createdAt.localeCompare(left.createdAt));
});

export const revokeSessionInviteV170 = onCall({ region: REGION }, async (request) => {
  const userId = requireAuth(request.auth);
  const data = dataOf(request.data);
  const sessionId = requiredString(data.sessionId, 'Session ID');
  const inviteId = requiredString(data.inviteId, 'Invitation ID');
  const { reference } = await requireOrganizer(userId, sessionId);
  const inviteReference = reference.collection('invites').doc(inviteId);
  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(inviteReference);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Invitation was not found.');
    const invite = snapshot.data() as SessionInviteRecord;
    if (invite.status === 'revoked') return invite;
    const saved: SessionInviteRecord = {
      ...invite,
      status: 'revoked',
      revokedAt: new Date().toISOString(),
    };
    transaction.set(inviteReference, saved);
    return saved;
  });
});

export const previewSessionInviteV170 = onCall({ region: REGION }, async (request) => {
  const parsed = parseShareCode(dataOf(request.data).shareCode);
  const reference = sessionReference(parsed.sessionId);
  const [sessionSnapshot, inviteSnapshot] = await Promise.all([
    reference.get(),
    reference.collection('invites').doc(hashSecret(parsed.rawToken)).get(),
  ]);
  if (!sessionSnapshot.exists || !inviteSnapshot.exists) {
    throw new HttpsError('not-found', 'This invitation is not available.');
  }
  const invite = inviteSnapshot.data() as SessionInviteRecord;
  if (!invitationUsable(invite)) {
    throw new HttpsError('not-found', 'This invitation is not available.');
  }
  const session = sessionSnapshot.data() as OrderSessionRecord;
  const organizerSnapshot = await reference
    .collection('participants')
    .doc(session.organizerId)
    .get();
  const organizerName = organizerSnapshot.exists
    ? (organizerSnapshot.data() as SessionParticipantRecord).displayName
    : 'Organizer';
  return publicPreview(session, organizerName);
});

export const joinOrderSessionAsGuestV170 = onCall(
  { region: REGION },
  async (request) => {
    const data = dataOf(request.data);
    const parsed = parseShareCode(data.shareCode);
    const displayName = requiredString(data.displayName, 'Guest display name', 120);
    const rawGuestSecret = randomToken();
    const guestId = `guest_${randomToken()}`;
    const reference = sessionReference(parsed.sessionId);
    const inviteReference = reference
      .collection('invites')
      .doc(hashSecret(parsed.rawToken));
    const guestReference = reference.collection('guestIdentities').doc(guestId);
    const participantReference = reference.collection('participants').doc(guestId);

    const capability = await firestore.runTransaction(async (transaction) => {
      const [sessionSnapshot, inviteSnapshot, participantSnapshots] =
        await Promise.all([
          transaction.get(reference),
          transaction.get(inviteReference),
          transaction.get(reference.collection('participants')),
        ]);
      if (!sessionSnapshot.exists || !inviteSnapshot.exists) {
        throw new HttpsError('not-found', 'This invitation is not available.');
      }
      const session = sessionSnapshot.data() as OrderSessionRecord;
      const invite = inviteSnapshot.data() as SessionInviteRecord;
      if (!invitationUsable(invite) || session.status !== 'collecting') {
        throw new HttpsError('not-found', 'This invitation is not available.');
      }
      if (participantSnapshots.size >= MAX_SESSION_PARTICIPANTS) {
        throw new HttpsError(
          'resource-exhausted',
          'This order session has reached its participant limit.',
        );
      }
      const timestamp = new Date().toISOString();
      const expiresAtMillis = Date.now() + GUEST_EXPIRY_MILLIS;
      const guest: GuestIdentityRecord = {
        sessionId: session.id,
        guestId,
        expiresAt: new Date(expiresAtMillis).toISOString(),
        expiresAtMillis,
        displayName,
        secretHash: hashSecret(rawGuestSecret),
        status: 'active',
        linkedUserId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const participant: SessionParticipantRecord = {
        userId: guestId,
        displayName,
        identityKind: 'guest',
        role: 'participant',
        response: 'viewed',
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
      };
      const usedCount = invite.usedCount + 1;
      transaction.set(inviteReference, {
        ...invite,
        usedCount,
        status: usedCount >= invite.maxUses ? 'exhausted' : 'pending',
      } satisfies SessionInviteRecord);
      transaction.create(guestReference, guest);
      transaction.create(participantReference, participant);
      transaction.update(reference, {
        participantIds: [...session.participantIds, guestId],
        responseSummary: responseSummaryAfterGuestJoin(session),
        revision: session.revision + 1,
        updatedAt: timestamp,
      });
      const event = activity(
        session.id,
        guestId,
        displayName,
        'guest_joined',
        timestamp,
      );
      transaction.create(reference.collection('activity').doc(event.id), event);
      return {
        sessionId: session.id,
        guestId,
        guestSecret: rawGuestSecret,
        expiresAt: guest.expiresAt,
        displayName,
      };
    });
    return capability;
  },
);

export const getGuestOrderSessionViewV170 = onCall(
  { region: REGION },
  async (request) => {
    const data = dataOf(request.data);
    return guestView(
      requiredString(data.sessionId, 'Session ID'),
      requiredString(data.guestId, 'Guest ID'),
      requiredString(data.guestSecret, 'Guest secret'),
    );
  },
);

export const updateGuestSessionContributionV170 = onCall(
  { region: REGION },
  async (request) => {
    const data = dataOf(request.data);
    const sessionId = requiredString(data.sessionId, 'Session ID');
    const guestId = requiredString(data.guestId, 'Guest ID');
    const guestSecret = requiredString(data.guestSecret, 'Guest secret');
    const expectedSessionRevision = requiredRevision(
      data.expectedSessionRevision,
      'Expected session revision',
    );
    const itemId = requiredString(data.itemId, 'Menu item ID');
    const mutationId = requiredString(data.mutationId, 'Mutation ID');
    const operation = requiredContributionOperation(data.operation);
    const value = requiredContributionValue(data.value);
    const reference = sessionReference(sessionId);
    const guestReference = reference.collection('guestIdentities').doc(guestId);
    const participantReference = reference.collection('participants').doc(guestId);
    const contributionReference = reference.collection('contributions').doc(guestId);
    const mutationDocumentId = hashSecret(`${guestId}\u0000${mutationId}`);
    const mutationReference = reference.collection('mutations').doc(mutationDocumentId);

    return firestore.runTransaction(async (transaction) => {
      const [
        guestSnapshot,
        mutationSnapshot,
        sessionSnapshot,
        participantSnapshot,
        contributionSnapshot,
        contributionSnapshots,
      ] = await Promise.all([
        transaction.get(guestReference),
        transaction.get(mutationReference),
        transaction.get(reference),
        transaction.get(participantReference),
        transaction.get(contributionReference),
        transaction.get(reference.collection('contributions')),
      ]);
      if (!guestSnapshot.exists) {
        throw new HttpsError('permission-denied', 'Guest access is invalid or expired.');
      }
      const guest = guestSnapshot.data() as GuestIdentityRecord;
      if (!guestUsable(guest, guestSecret)) {
        throw new HttpsError('permission-denied', 'Guest access is invalid or expired.');
      }
      if (mutationSnapshot.exists) {
        const mutation = mutationSnapshot.data() as SessionMutationRecord;
        const currentSession = sessionSnapshot.data() as OrderSessionRecord;
        return { mutation, sessionRevision: currentSession.revision };
      }
      if (!sessionSnapshot.exists || !participantSnapshot.exists) {
        throw new HttpsError('not-found', 'Guest order data was not found.');
      }
      const session = sessionSnapshot.data() as OrderSessionRecord;
      const participant = participantSnapshot.data() as SessionParticipantRecord;
      assertGuestContributionAccess(guest, guestSecret, session, expectedSessionRevision);
      const item = session.menuItems.find((candidate) => candidate.id === itemId);
      if (!item?.active) {
        throw new HttpsError('failed-precondition', 'This item is not available.');
      }
      const current = contributionSnapshot.exists
        ? (contributionSnapshot.data() as SessionContributionRecord)
        : null;
      const currentQuantity = current?.quantities[itemId] ?? 0;
      const target = requiredTargetQuantity(currentQuantity, operation, value);
      const timestamp = new Date().toISOString();
      const quantities = updatedQuantities(current?.quantities, itemId, target);
      const contribution: SessionContributionRecord = {
        sessionId,
        userId: guestId,
        displayName: guest.displayName,
        quantities,
        revision: (current?.revision ?? 0) + 1,
        lastMutationId: mutationId,
        updatedAt: timestamp,
      };
      const mutation: SessionMutationRecord = {
        id: mutationId,
        sessionId,
        userId: guestId,
        itemId,
        operation,
        requestedValue: value,
        appliedDelta: target - currentQuantity,
        resultQuantity: target,
        resultRevision: contribution.revision,
        createdAt: timestamp,
      };
      const contributions = contributionSnapshots.docs.map((documentSnapshot) =>
        documentSnapshot.id === guestId
          ? contribution
          : (documentSnapshot.data() as SessionContributionRecord),
      );
      if (!contributionSnapshot.exists) contributions.push(contribution);
      const aggregate = computeAggregate(contributions);
      const grandTotal = expectedTotal(session, aggregate);
      const updatedParticipant =
        participant.response === 'ordering'
          ? participant
          : markResponse(participant, 'ordering', timestamp);
      transaction.set(contributionReference, contribution);
      transaction.create(mutationReference, mutation);
      if (updatedParticipant !== participant) {
        transaction.set(participantReference, updatedParticipant);
      }
      transaction.update(reference, {
        aggregate,
        responseSummary: responseSummaryAfterChange(
          session,
          participant.response,
          updatedParticipant.response,
        ),
        settlementSummary: {
          ...session.settlementSummary,
          participantCount: contributions.filter(
            (candidate) => Object.keys(candidate.quantities).length > 0,
          ).length,
          expectedGrandTotalMinor: grandTotal,
          outstandingGrandTotalMinor: grandTotal,
        },
        revision: session.revision + 1,
        updatedAt: timestamp,
      });
      const event = activity(
        sessionId,
        guestId,
        guest.displayName,
        'contribution_updated',
        timestamp,
        { itemId, quantity: String(target) },
      );
      transaction.create(reference.collection('activity').doc(event.id), event);
      return { mutation, sessionRevision: session.revision + 1 };
    });
  },
);

export const updateGuestSessionResponseV170 = onCall(
  { region: REGION },
  async (request) => {
    const data = dataOf(request.data);
    const sessionId = requiredString(data.sessionId, 'Session ID');
    const guestId = requiredString(data.guestId, 'Guest ID');
    const guestSecret = requiredString(data.guestSecret, 'Guest secret');
    const expectedSessionRevision = requiredRevision(
      data.expectedSessionRevision,
      'Expected session revision',
    );
    const expectedParticipantRevision = requiredRevision(
      data.expectedParticipantRevision,
      'Expected participant revision',
    );
    const response = requiredString(data.response, 'Participant response') as
      | 'done'
      | 'skipped';
    if (!['done', 'skipped'].includes(response)) {
      throw new HttpsError('invalid-argument', 'Participant response is invalid.');
    }
    const reference = sessionReference(sessionId);
    const guestReference = reference.collection('guestIdentities').doc(guestId);
    const participantReference = reference.collection('participants').doc(guestId);
    await firestore.runTransaction(async (transaction) => {
      const [guestSnapshot, sessionSnapshot, participantSnapshot] = await Promise.all([
        transaction.get(guestReference),
        transaction.get(reference),
        transaction.get(participantReference),
      ]);
      if (!guestSnapshot.exists || !sessionSnapshot.exists || !participantSnapshot.exists) {
        throw new HttpsError('permission-denied', 'Guest access is invalid or expired.');
      }
      const guest = guestSnapshot.data() as GuestIdentityRecord;
      const session = sessionSnapshot.data() as OrderSessionRecord;
      const participant = participantSnapshot.data() as SessionParticipantRecord;
      if (!guestUsable(guest, guestSecret)) {
        throw new HttpsError('permission-denied', 'Guest access is invalid or expired.');
      }
      if (session.revision !== expectedSessionRevision) {
        throw new HttpsError('aborted', 'The order session changed. Refresh and try again.');
      }
      if (participant.revision !== expectedParticipantRevision) {
        throw new HttpsError(
          'aborted',
          'Your participant status changed. Refresh and try again.',
        );
      }
      if (session.status !== 'collecting') {
        throw new HttpsError('failed-precondition', 'Participant responses are closed.');
      }
      const timestamp = new Date().toISOString();
      const saved = markResponse(participant, response, timestamp);
      transaction.set(participantReference, saved);
      transaction.update(reference, {
        responseSummary: responseSummaryAfterChange(
          session,
          participant.response,
          response,
        ),
        revision: session.revision + 1,
        updatedAt: timestamp,
      });
    });
    return guestView(sessionId, guestId, guestSecret);
  },
);

export const linkGuestOrderSessionAccountV170 = onCall(
  { region: REGION },
  async (request) => {
    const userId = requireAuth(request.auth);
    const data = dataOf(request.data);
    const sessionId = requiredString(data.sessionId, 'Session ID');
    const guestId = requiredString(data.guestId, 'Guest ID');
    const guestSecret = requiredString(data.guestSecret, 'Guest secret');
    const reference = sessionReference(sessionId);
    const guestReference = reference.collection('guestIdentities').doc(guestId);
    const guestParticipantReference = reference.collection('participants').doc(guestId);
    const accountParticipantReference = reference.collection('participants').doc(userId);
    const guestContributionReference = reference.collection('contributions').doc(guestId);
    const accountContributionReference = reference.collection('contributions').doc(userId);

    return firestore.runTransaction(async (transaction) => {
      const [
        sessionSnapshot,
        guestSnapshot,
        guestParticipantSnapshot,
        accountParticipantSnapshot,
        guestContributionSnapshot,
      ] = await Promise.all([
        transaction.get(reference),
        transaction.get(guestReference),
        transaction.get(guestParticipantReference),
        transaction.get(accountParticipantReference),
        transaction.get(guestContributionReference),
      ]);
      if (!sessionSnapshot.exists || !guestSnapshot.exists || !guestParticipantSnapshot.exists) {
        throw new HttpsError('permission-denied', 'Guest access is invalid or expired.');
      }
      const session = sessionSnapshot.data() as OrderSessionRecord;
      const guest = guestSnapshot.data() as GuestIdentityRecord;
      if (guest.status === 'linked' && guest.linkedUserId === userId) {
        return {
          sessionId,
          guestId,
          userId,
          linkedAt: guest.updatedAt,
          transferredMutationCount: guestContributionSnapshot.exists ? 1 : 0,
        };
      }
      if (!guestUsable(guest, guestSecret)) {
        throw new HttpsError('permission-denied', 'Guest access is invalid or expired.');
      }
      if (accountParticipantSnapshot.exists) {
        throw new HttpsError(
          'already-exists',
          'This account already participates in the order session.',
        );
      }
      const timestamp = new Date().toISOString();
      const guestParticipant =
        guestParticipantSnapshot.data() as SessionParticipantRecord;
      transaction.create(accountParticipantReference, {
        ...guestParticipant,
        userId,
        identityKind: 'account',
        revision: guestParticipant.revision + 1,
        lastActivityAt: timestamp,
        updatedAt: timestamp,
      } satisfies SessionParticipantRecord);
      transaction.delete(guestParticipantReference);
      if (guestContributionSnapshot.exists) {
        const guestContribution =
          guestContributionSnapshot.data() as SessionContributionRecord;
        transaction.create(accountContributionReference, {
          ...guestContribution,
          userId,
          revision: guestContribution.revision + 1,
          updatedAt: timestamp,
        } satisfies SessionContributionRecord);
        transaction.delete(guestContributionReference);
      }
      transaction.set(guestReference, {
        ...guest,
        status: 'linked',
        linkedUserId: userId,
        updatedAt: timestamp,
      } satisfies GuestIdentityRecord);
      transaction.update(reference, {
        participantIds: session.participantIds.map((participantId) =>
          participantId === guestId ? userId : participantId,
        ),
        revision: session.revision + 1,
        updatedAt: timestamp,
      });
      const event = activity(
        sessionId,
        userId,
        guest.displayName,
        'guest_account_linked',
        timestamp,
        { guestId },
      );
      transaction.create(reference.collection('activity').doc(event.id), event);
      return {
        sessionId,
        guestId,
        userId,
        linkedAt: timestamp,
        transferredMutationCount: guestContributionSnapshot.exists ? 1 : 0,
      };
    });
  },
);
