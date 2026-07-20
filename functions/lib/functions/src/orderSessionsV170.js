import { createHash, randomUUID } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
const REGION = 'europe-west1';
const MAX_MENU_ITEMS = 50;
const MAX_SESSION_PARTICIPANTS = 20;
const MAX_QUANTITY = 999;
const MAX_TITLE_LENGTH = 80;
const MAX_TIMEZONE_LENGTH = 80;
const MAX_IDENTIFIER_LENGTH = 160;
const SESSION_STATUS = {
    draft: 'draft',
    collecting: 'collecting',
    locked: 'locked',
    submitted: 'submitted',
    confirmed: 'confirmed',
    delivered: 'delivered',
    settling: 'settling',
    settled: 'settled',
    cancelled: 'cancelled',
};
const PARTICIPANT_RESPONSE = {
    pending: 'pending',
    viewed: 'viewed',
    ordering: 'ordering',
    done: 'done',
    skipped: 'skipped',
    removed: 'removed',
};
const ALLOWED_SESSION_TRANSITIONS = {
    draft: [SESSION_STATUS.collecting, SESSION_STATUS.cancelled],
    collecting: [SESSION_STATUS.locked, SESSION_STATUS.cancelled],
    locked: [
        SESSION_STATUS.collecting,
        SESSION_STATUS.submitted,
        SESSION_STATUS.cancelled,
    ],
    submitted: [SESSION_STATUS.confirmed, SESSION_STATUS.cancelled],
    confirmed: [SESSION_STATUS.delivered, SESSION_STATUS.cancelled],
    delivered: [SESSION_STATUS.settling],
    settling: [SESSION_STATUS.settled],
    settled: [],
    cancelled: [],
};
const ALLOWED_RESPONSE_TRANSITIONS = {
    pending: [
        PARTICIPANT_RESPONSE.viewed,
        PARTICIPANT_RESPONSE.ordering,
        PARTICIPANT_RESPONSE.done,
        PARTICIPANT_RESPONSE.skipped,
    ],
    viewed: [
        PARTICIPANT_RESPONSE.ordering,
        PARTICIPANT_RESPONSE.done,
        PARTICIPANT_RESPONSE.skipped,
    ],
    ordering: [PARTICIPANT_RESPONSE.done, PARTICIPANT_RESPONSE.skipped],
    done: [PARTICIPANT_RESPONSE.ordering, PARTICIPANT_RESPONSE.skipped],
    skipped: [PARTICIPANT_RESPONSE.ordering, PARTICIPANT_RESPONSE.done],
    removed: [],
};
const firestore = getFirestore();
const requestData = (value) => typeof value === 'object' && value !== null
    ? value
    : {};
const requireAuth = (auth) => {
    if (!auth)
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    return auth;
};
const requiredString = (value, label, maximumLength = MAX_IDENTIFIER_LENGTH) => {
    if (typeof value !== 'string') {
        throw new HttpsError('invalid-argument', `${label} must be text.`);
    }
    const normalized = value.trim();
    if (!normalized || normalized.length > maximumLength) {
        throw new HttpsError('invalid-argument', `${label} must contain between 1 and ${maximumLength} characters.`);
    }
    return normalized;
};
const optionalString = (value, label, maximumLength = MAX_IDENTIFIER_LENGTH) => {
    if (value === undefined || value === null || value === '')
        return null;
    return requiredString(value, label, maximumLength);
};
const requiredRevision = (value, label) => {
    if (!Number.isSafeInteger(value) || value < 1) {
        throw new HttpsError('invalid-argument', `${label} must be a positive integer.`);
    }
    return value;
};
const requiredContributionOperation = (value) => {
    if (value !== 'set' && value !== 'increment') {
        throw new HttpsError('invalid-argument', 'The contribution operation is invalid.');
    }
    return value;
};
const requiredContributionValue = (value) => {
    if (!Number.isSafeInteger(value)) {
        throw new HttpsError('invalid-argument', 'The contribution value must be an integer.');
    }
    return value;
};
const updatedQuantities = (current, itemId, target) => {
    const entries = Object.entries(current ?? {}).filter(([candidateItemId]) => candidateItemId !== itemId);
    if (target > 0)
        entries.push([itemId, target]);
    return Object.fromEntries(entries);
};
const assertContributionAccess = (session, participant, expectedSessionRevision) => {
    if (session.revision !== expectedSessionRevision) {
        throw new HttpsError('aborted', 'The order session changed. Refresh and try again.');
    }
    if (session.status !== SESSION_STATUS.collecting) {
        throw new HttpsError('failed-precondition', 'The order session is not collecting contributions.');
    }
    if (session.deadlineAt && Date.now() >= Date.parse(session.deadlineAt)) {
        throw new HttpsError('failed-precondition', 'The order session deadline has passed.');
    }
    if (participant.role === 'viewer' || participant.response === PARTICIPANT_RESPONSE.removed) {
        throw new HttpsError('permission-denied', 'You do not have permission to contribute to this session.');
    }
};
const requiredTargetQuantity = (currentQuantity, operation, value) => {
    const target = operation === 'set' ? value : currentQuantity + value;
    if (!Number.isSafeInteger(target) || target < 0 || target > MAX_QUANTITY) {
        throw new HttpsError('invalid-argument', `Quantity must be between 0 and ${MAX_QUANTITY}.`);
    }
    return target;
};
const optionalBoolean = (value, fallback = false) => {
    if (value === undefined || value === null)
        return fallback;
    if (typeof value !== 'boolean') {
        throw new HttpsError('invalid-argument', 'The supplied boolean value is invalid.');
    }
    return value;
};
const optionalIsoTimestamp = (value, label) => {
    const normalized = optionalString(value, label, 64);
    if (normalized === null)
        return null;
    if (Number.isNaN(Date.parse(normalized))) {
        throw new HttpsError('invalid-argument', `${label} must be a valid ISO timestamp.`);
    }
    return normalized;
};
const actorName = (token) => {
    const name = token.name;
    if (typeof name === 'string' && name.trim())
        return name.trim().slice(0, 120);
    const email = token.email;
    if (typeof email === 'string' && email.includes('@')) {
        return (email.split('@')[0] ?? 'User').slice(0, 120);
    }
    return 'User';
};
const safeInteger = (value, fallback = 0) => Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback;
const basisPoints = (value) => Math.min(10_000, safeInteger(value));
const allocation = (value) => value === 'equal' ? 'equal' : 'proportional';
const normalizePricingPolicy = (value) => {
    const policy = requestData(value);
    return {
        vatBasisPoints: basisPoints(policy.vatBasisPoints),
        serviceBasisPoints: basisPoints(policy.serviceBasisPoints),
        deliveryMinor: safeInteger(policy.deliveryMinor),
        vatAllocation: allocation(policy.vatAllocation),
        serviceAllocation: allocation(policy.serviceAllocation),
        deliveryAllocation: allocation(policy.deliveryAllocation),
    };
};
const normalizeMenuItems = (value) => {
    if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MENU_ITEMS) {
        throw new HttpsError('failed-precondition', `The menu must contain between 1 and ${MAX_MENU_ITEMS} items.`);
    }
    const identifiers = new Set();
    return value
        .map((rawValue, index) => {
        const raw = requestData(rawValue);
        const id = requiredString(raw.id, 'Menu item ID');
        if (identifiers.has(id)) {
            throw new HttpsError('failed-precondition', 'Menu item IDs must be unique.');
        }
        identifiers.add(id);
        const unitPrice = typeof raw.unitPrice === 'number' && Number.isFinite(raw.unitPrice)
            ? Math.max(0, raw.unitPrice)
            : 0;
        const unitPriceMinor = Math.round(unitPrice * 100);
        if (!Number.isSafeInteger(unitPriceMinor)) {
            throw new HttpsError('failed-precondition', 'A menu item price is unsupported.');
        }
        return {
            id,
            name: requiredString(raw.name, 'Menu item name', 120),
            description: typeof raw.description === 'string' ? raw.description.trim().slice(0, 500) : '',
            category: typeof raw.category === 'string' ? raw.category.trim().slice(0, 80) : '',
            unitPriceMinor,
            active: raw.active !== false && raw.approvalStatus !== 'pending',
            sortOrder: safeInteger(raw.sortOrder, index),
            createdByUserId: typeof raw.createdByUserId === 'string' && raw.createdByUserId.trim()
                ? raw.createdByUserId.trim()
                : null,
            createdByName: typeof raw.createdByName === 'string' && raw.createdByName.trim()
                ? raw.createdByName.trim().slice(0, 120)
                : null,
            source: raw.source === 'custom' ? 'custom' : 'catalog',
        };
    })
        .sort((left, right) => left.sortOrder - right.sortOrder);
};
const emptyResponseSummary = (participantCount) => ({
    pending: participantCount,
    viewed: 0,
    ordering: 0,
    done: 0,
    skipped: 0,
    removed: 0,
    eligibleForFinalization: 0,
    total: participantCount,
});
const emptySettlementSummary = () => ({
    participantCount: 0,
    expectedGrandTotalMinor: 0,
    outstandingGrandTotalMinor: 0,
    verifiedGrandTotalMinor: 0,
    settledParticipantCount: 0,
});
const participantRole = (role) => {
    if (role === 'owner')
        return 'organizer';
    if (role === 'editor')
        return 'editor';
    if (role === 'viewer')
        return 'viewer';
    return 'participant';
};
const participantRecord = (userId, displayName, role, timestamp) => ({
    userId,
    displayName,
    identityKind: 'account',
    role,
    response: PARTICIPANT_RESPONSE.pending,
    includeInFinalOrder: false,
    firstViewedAt: null,
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
const summarizeResponses = (participants) => {
    const summary = emptyResponseSummary(0);
    for (const participant of participants) {
        summary[participant.response] += 1;
        summary.total += 1;
        if (participant.response === PARTICIPANT_RESPONSE.done &&
            participant.includeInFinalOrder) {
            summary.eligibleForFinalization += 1;
        }
    }
    return summary;
};
const markResponse = (participant, nextResponse, timestamp) => {
    if (participant.response === nextResponse)
        return participant;
    if (!ALLOWED_RESPONSE_TRANSITIONS[participant.response].includes(nextResponse)) {
        throw new HttpsError('failed-precondition', `Participant response cannot change from ${participant.response} to ${nextResponse}.`);
    }
    return {
        ...participant,
        response: nextResponse,
        includeInFinalOrder: nextResponse === PARTICIPANT_RESPONSE.done ||
            nextResponse === PARTICIPANT_RESPONSE.ordering,
        firstViewedAt: participant.firstViewedAt ?? timestamp,
        completedAt: nextResponse === PARTICIPANT_RESPONSE.done ? timestamp : null,
        skippedAt: nextResponse === PARTICIPANT_RESPONSE.skipped ? timestamp : null,
        removedAt: nextResponse === PARTICIPANT_RESPONSE.removed ? timestamp : null,
        lastActivityAt: timestamp,
        revision: participant.revision + 1,
        updatedAt: timestamp,
    };
};
const calculateBasisPointCharge = (amountMinor, points) => Math.round((amountMinor * points) / 10_000);
const computeAggregate = (contributions) => {
    const aggregate = {};
    for (const contribution of contributions) {
        for (const [itemId, quantity] of Object.entries(contribution.quantities)) {
            if (quantity <= 0)
                continue;
            aggregate[itemId] = (aggregate[itemId] ?? 0) + quantity;
        }
    }
    return aggregate;
};
const expectedGrandTotal = (session, aggregate) => {
    const itemSubtotalMinor = session.menuItems.reduce((total, item) => {
        const quantity = aggregate[item.id] ?? 0;
        const lineTotal = item.unitPriceMinor * quantity;
        if (!Number.isSafeInteger(lineTotal)) {
            throw new HttpsError('failed-precondition', 'The order total is unsupported.');
        }
        return total + lineTotal;
    }, 0);
    return (itemSubtotalMinor +
        calculateBasisPointCharge(itemSubtotalMinor, session.pricingPolicy.vatBasisPoints) +
        calculateBasisPointCharge(itemSubtotalMinor, session.pricingPolicy.serviceBasisPoints) +
        session.pricingPolicy.deliveryMinor);
};
const occurrenceSessionId = (ownerId, occurrenceKey) => `scheduled_${createHash('sha256')
    .update(`${ownerId}\u0000${occurrenceKey}`)
    .digest('hex')
    .slice(0, 40)}`;
const transitionSession = (session, nextStatus, timestamp) => {
    if (session.status === nextStatus)
        return session;
    if (!ALLOWED_SESSION_TRANSITIONS[session.status].includes(nextStatus)) {
        throw new HttpsError('failed-precondition', `The session cannot change from ${session.status} to ${nextStatus}.`);
    }
    const next = {
        ...session,
        status: nextStatus,
        revision: session.revision + 1,
        updatedAt: timestamp,
    };
    if (nextStatus === SESSION_STATUS.collecting) {
        next.openedAt ??= timestamp;
        if (session.status === SESSION_STATUS.locked)
            next.lockedAt = null;
    }
    if (nextStatus === SESSION_STATUS.locked)
        next.lockedAt = timestamp;
    if (nextStatus === SESSION_STATUS.submitted)
        next.submittedAt = timestamp;
    if (nextStatus === SESSION_STATUS.confirmed)
        next.confirmedAt = timestamp;
    if (nextStatus === SESSION_STATUS.delivered)
        next.deliveredAt = timestamp;
    if (nextStatus === SESSION_STATUS.settling)
        next.settlingAt = timestamp;
    if (nextStatus === SESSION_STATUS.settled)
        next.settledAt = timestamp;
    if (nextStatus === SESSION_STATUS.cancelled)
        next.cancelledAt = timestamp;
    return next;
};
const auditEvent = (sessionId, actorId, actorDisplayName, type, timestamp, metadata = {}) => ({
    id: randomUUID(),
    sessionId,
    actorId,
    actorDisplayName,
    type,
    metadata,
    createdAt: timestamp,
});
export const listOrderSessionsV170 = onCall({ region: REGION }, async (request) => {
    const auth = requireAuth(request.auth);
    const snapshot = await firestore
        .collection('orderSessions')
        .where('participantIds', 'array-contains', auth.uid)
        .limit(100)
        .get();
    return snapshot.docs
        .map((documentSnapshot) => documentSnapshot.data())
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
});
export const createOrderSessionV170 = onCall({ region: REGION }, async (request) => {
    const auth = requireAuth(request.auth);
    const data = requestData(request.data);
    const menuTemplateId = requiredString(data.menuTemplateId, 'Menu template ID');
    const timezone = requiredString(data.timezone, 'Timezone', MAX_TIMEZONE_LENGTH);
    const titleOverride = optionalString(data.title, 'Session title', MAX_TITLE_LENGTH);
    const deadlineAt = optionalIsoTimestamp(data.deadlineAt, 'Deadline');
    const autoLock = optionalBoolean(data.autoLock);
    const workspaceId = optionalString(data.workspaceId, 'Workspace ID');
    const scheduleOccurrenceKey = optionalString(data.scheduleOccurrenceKey, 'Schedule occurrence key');
    const sessionId = scheduleOccurrenceKey
        ? occurrenceSessionId(auth.uid, scheduleOccurrenceKey)
        : firestore.collection('orderSessions').doc().id;
    const sessionReference = firestore.collection('orderSessions').doc(sessionId);
    const bucketReference = firestore.collection('buckets').doc(menuTemplateId);
    return firestore.runTransaction(async (transaction) => {
        const [existingSnapshot, bucketSnapshot, memberSnapshots] = await Promise.all([
            transaction.get(sessionReference),
            transaction.get(bucketReference),
            transaction.get(bucketReference.collection('members')),
        ]);
        if (existingSnapshot.exists) {
            const existing = existingSnapshot.data();
            if (scheduleOccurrenceKey &&
                existing.organizerId === auth.uid &&
                existing.scheduleOccurrenceKey === scheduleOccurrenceKey) {
                return existing;
            }
            throw new HttpsError('already-exists', 'The order session already exists.');
        }
        if (!bucketSnapshot.exists) {
            throw new HttpsError('not-found', 'Menu template was not found.');
        }
        const bucket = bucketSnapshot.data();
        if (bucket.ownerId !== auth.uid) {
            throw new HttpsError('permission-denied', 'Only the menu owner may open an order session.');
        }
        const menuItems = normalizeMenuItems(bucket.items);
        const timestamp = new Date().toISOString();
        const ownerDisplayName = actorName(auth.token);
        const memberParticipants = memberSnapshots.docs
            .map((documentSnapshot) => documentSnapshot.data())
            .filter((member) => member.status === 'active' &&
            typeof member.userId === 'string' &&
            member.userId !== auth.uid)
            .slice(0, MAX_SESSION_PARTICIPANTS - 1)
            .map((member) => participantRecord(requiredString(member.userId, 'Member ID'), requiredString(member.displayName, 'Member display name', 120), participantRole(member.role), timestamp));
        const participants = [
            participantRecord(auth.uid, ownerDisplayName, 'organizer', timestamp),
            ...memberParticipants,
        ];
        const session = {
            id: sessionId,
            menuTemplateId,
            sourceMenuRevision: requiredRevision(bucket.revision, 'Menu revision'),
            organizerId: auth.uid,
            workspaceId,
            participantIds: participants.map((participant) => participant.userId),
            title: titleOverride ?? requiredString(bucket.title, 'Menu title', MAX_TITLE_LENGTH),
            currency: requiredString(bucket.currency, 'Currency', 8),
            timezone,
            status: SESSION_STATUS.collecting,
            deadlineAt,
            autoLock,
            scheduleOccurrenceKey,
            menuItems,
            pricingPolicy: normalizePricingPolicy(bucket.pricingPolicy),
            aggregate: {},
            responseSummary: emptyResponseSummary(participants.length),
            settlementSummary: emptySettlementSummary(),
            schemaVersion: 1,
            revision: 2,
            openedAt: timestamp,
            lockedAt: null,
            submittedAt: null,
            confirmedAt: null,
            deliveredAt: null,
            settlingAt: null,
            settledAt: null,
            cancelledAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
        };
        transaction.create(sessionReference, session);
        for (const participant of participants) {
            transaction.create(sessionReference.collection('participants').doc(participant.userId), participant);
        }
        const event = auditEvent(sessionId, auth.uid, ownerDisplayName, 'session_opened', timestamp, { menuTemplateId });
        transaction.create(sessionReference.collection('activity').doc(event.id), event);
        return session;
    });
});
export const getOrderSessionViewV170 = onCall({ region: REGION }, async (request) => {
    const auth = requireAuth(request.auth);
    const data = requestData(request.data);
    const sessionId = requiredString(data.sessionId, 'Session ID');
    const sessionReference = firestore.collection('orderSessions').doc(sessionId);
    const [sessionSnapshot, participantSnapshots, contributionSnapshots] = await Promise.all([
        sessionReference.get(),
        sessionReference.collection('participants').get(),
        sessionReference.collection('contributions').get(),
    ]);
    if (!sessionSnapshot.exists)
        return null;
    const session = sessionSnapshot.data();
    if (!session.participantIds.includes(auth.uid)) {
        throw new HttpsError('permission-denied', 'Order session access is required.');
    }
    const participants = participantSnapshots.docs.map((documentSnapshot) => documentSnapshot.data());
    return {
        session,
        participants,
        contributions: contributionSnapshots.docs.map((documentSnapshot) => documentSnapshot.data()),
        currentParticipant: participants.find((participant) => participant.userId === auth.uid) ?? null,
    };
});
export const transitionOrderSessionV170 = onCall({ region: REGION }, async (request) => {
    const auth = requireAuth(request.auth);
    const data = requestData(request.data);
    const sessionId = requiredString(data.sessionId, 'Session ID');
    const expectedRevision = requiredRevision(data.expectedRevision, 'Expected revision');
    const nextStatus = requiredString(data.nextStatus, 'Next status');
    if (!Object.values(SESSION_STATUS).includes(nextStatus)) {
        throw new HttpsError('invalid-argument', 'The next session status is invalid.');
    }
    const sessionReference = firestore.collection('orderSessions').doc(sessionId);
    return firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(sessionReference);
        if (!snapshot.exists)
            throw new HttpsError('not-found', 'Order session was not found.');
        const session = snapshot.data();
        if (session.organizerId !== auth.uid) {
            throw new HttpsError('permission-denied', 'Only the session organizer may change its lifecycle.');
        }
        if (session.revision !== expectedRevision) {
            throw new HttpsError('aborted', 'The order session changed. Refresh and try again.');
        }
        const timestamp = new Date().toISOString();
        const saved = transitionSession(session, nextStatus, timestamp);
        if (saved === session)
            return session;
        transaction.set(sessionReference, saved);
        const event = auditEvent(sessionId, auth.uid, actorName(auth.token), 'session_status_changed', timestamp, { from: session.status, to: nextStatus });
        transaction.create(sessionReference.collection('activity').doc(event.id), event);
        return saved;
    });
});
export const updateSessionParticipantResponseV170 = onCall({ region: REGION }, async (request) => {
    const auth = requireAuth(request.auth);
    const data = requestData(request.data);
    const sessionId = requiredString(data.sessionId, 'Session ID');
    const expectedSessionRevision = requiredRevision(data.expectedSessionRevision, 'Expected session revision');
    const expectedParticipantRevision = requiredRevision(data.expectedParticipantRevision, 'Expected participant revision');
    const response = requiredString(data.response, 'Participant response');
    if (!Object.values(PARTICIPANT_RESPONSE).includes(response)) {
        throw new HttpsError('invalid-argument', 'The participant response is invalid.');
    }
    const sessionReference = firestore.collection('orderSessions').doc(sessionId);
    const participantReference = sessionReference
        .collection('participants')
        .doc(auth.uid);
    return firestore.runTransaction(async (transaction) => {
        const [sessionSnapshot, participantSnapshot, participantSnapshots] = await Promise.all([
            transaction.get(sessionReference),
            transaction.get(participantReference),
            transaction.get(sessionReference.collection('participants')),
        ]);
        if (!sessionSnapshot.exists) {
            throw new HttpsError('not-found', 'Order session was not found.');
        }
        if (!participantSnapshot.exists) {
            throw new HttpsError('permission-denied', 'You are not a participant in this order session.');
        }
        const session = sessionSnapshot.data();
        const participant = participantSnapshot.data();
        if (session.revision !== expectedSessionRevision) {
            throw new HttpsError('aborted', 'The order session changed. Refresh and try again.');
        }
        if (participant.revision !== expectedParticipantRevision) {
            throw new HttpsError('aborted', 'Your participant status changed. Refresh and try again.');
        }
        if (session.status !== SESSION_STATUS.collecting) {
            throw new HttpsError('failed-precondition', 'Participant responses can change only while the session is collecting.');
        }
        const timestamp = new Date().toISOString();
        const saved = markResponse(participant, response, timestamp);
        if (saved === participant)
            return participant;
        const participants = participantSnapshots.docs.map((documentSnapshot) => documentSnapshot.id === auth.uid
            ? saved
            : documentSnapshot.data());
        transaction.set(participantReference, saved);
        transaction.update(sessionReference, {
            responseSummary: summarizeResponses(participants),
            revision: session.revision + 1,
            updatedAt: timestamp,
        });
        const event = auditEvent(sessionId, auth.uid, actorName(auth.token), 'participant_response_changed', timestamp, { response });
        transaction.create(sessionReference.collection('activity').doc(event.id), event);
        return saved;
    });
});
export const updateSessionContributionV170 = onCall({ region: REGION }, async (request) => {
    const auth = requireAuth(request.auth);
    const data = requestData(request.data);
    const sessionId = requiredString(data.sessionId, 'Session ID');
    const expectedSessionRevision = requiredRevision(data.expectedSessionRevision, 'Expected session revision');
    const itemId = requiredString(data.itemId, 'Menu item ID');
    const operation = requiredContributionOperation(data.operation);
    const value = requiredContributionValue(data.value);
    const mutationId = requiredString(data.mutationId, 'Mutation ID');
    const sessionReference = firestore.collection('orderSessions').doc(sessionId);
    const participantReference = sessionReference
        .collection('participants')
        .doc(auth.uid);
    const contributionReference = sessionReference
        .collection('contributions')
        .doc(auth.uid);
    const mutationReference = sessionReference
        .collection('mutations')
        .doc(mutationId);
    return firestore.runTransaction(async (transaction) => {
        const [sessionSnapshot, participantSnapshot, contributionSnapshot, mutationSnapshot, contributionSnapshots,] = await Promise.all([
            transaction.get(sessionReference),
            transaction.get(participantReference),
            transaction.get(contributionReference),
            transaction.get(mutationReference),
            transaction.get(sessionReference.collection('contributions')),
        ]);
        if (mutationSnapshot.exists) {
            return mutationSnapshot.data();
        }
        if (!sessionSnapshot.exists) {
            throw new HttpsError('not-found', 'Order session was not found.');
        }
        if (!participantSnapshot.exists) {
            throw new HttpsError('permission-denied', 'You are not a participant in this order session.');
        }
        const session = sessionSnapshot.data();
        const participant = participantSnapshot.data();
        assertContributionAccess(session, participant, expectedSessionRevision);
        const item = session.menuItems.find((candidate) => candidate.id === itemId);
        if (!item?.active) {
            throw new HttpsError('failed-precondition', 'This item is not available.');
        }
        const current = contributionSnapshot.exists
            ? contributionSnapshot.data()
            : null;
        const currentQuantity = current?.quantities[itemId] ?? 0;
        const target = requiredTargetQuantity(currentQuantity, operation, value);
        const timestamp = new Date().toISOString();
        const quantities = updatedQuantities(current?.quantities, itemId, target);
        const contribution = {
            sessionId,
            userId: auth.uid,
            displayName: participant.displayName,
            quantities,
            revision: (current?.revision ?? 0) + 1,
            lastMutationId: mutationId,
            updatedAt: timestamp,
        };
        const record = {
            id: mutationId,
            sessionId,
            userId: auth.uid,
            itemId,
            operation,
            requestedValue: value,
            appliedDelta: target - currentQuantity,
            resultQuantity: target,
            resultRevision: contribution.revision,
            createdAt: timestamp,
        };
        const contributions = contributionSnapshots.docs.map((documentSnapshot) => documentSnapshot.id === auth.uid
            ? contribution
            : documentSnapshot.data());
        if (!contributionSnapshot.exists)
            contributions.push(contribution);
        const aggregate = computeAggregate(contributions);
        const grandTotalMinor = expectedGrandTotal(session, aggregate);
        const updatedParticipant = participant.response === PARTICIPANT_RESPONSE.ordering
            ? participant
            : markResponse(participant, PARTICIPANT_RESPONSE.ordering, timestamp);
        transaction.set(contributionReference, contribution);
        transaction.create(mutationReference, record);
        if (updatedParticipant !== participant) {
            transaction.set(participantReference, updatedParticipant);
        }
        transaction.update(sessionReference, {
            aggregate,
            responseSummary: {
                ...session.responseSummary,
                [participant.response]: Math.max(0, session.responseSummary[participant.response] -
                    (updatedParticipant === participant ? 0 : 1)),
                ordering: session.responseSummary.ordering +
                    (updatedParticipant === participant ? 0 : 1),
            },
            settlementSummary: {
                ...session.settlementSummary,
                participantCount: contributions.filter((candidate) => Object.keys(candidate.quantities).length > 0).length,
                expectedGrandTotalMinor: grandTotalMinor,
                outstandingGrandTotalMinor: grandTotalMinor,
            },
            revision: session.revision + 1,
            updatedAt: timestamp,
        });
        const event = auditEvent(sessionId, auth.uid, participant.displayName, 'contribution_updated', timestamp, { itemId, quantity: String(target) });
        transaction.create(sessionReference.collection('activity').doc(event.id), event);
        return record;
    });
});
