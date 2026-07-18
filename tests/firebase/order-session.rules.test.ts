import { readFile } from 'node:fs/promises';

import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const PROJECT_ID = 'food-order-v1-order-session-rules-test';
const SESSION_ID = 'session-private';
const OWNER_ID = 'owner-user';
const PARTICIPANT_ID = 'participant-user';
const OTHER_ID = 'other-user';
const NOW = '2026-07-18T15:00:00.000Z';

let environment: RulesTestEnvironment;

const sessionDocument = () => ({
  id: SESSION_ID,
  menuTemplateId: 'bucket-1',
  sourceMenuRevision: 2,
  organizerId: OWNER_ID,
  workspaceId: null,
  participantIds: [OWNER_ID, PARTICIPANT_ID],
  title: 'Private order session',
  currency: 'EGP',
  timezone: 'Africa/Cairo',
  status: 'collecting',
  deadlineAt: null,
  autoLock: false,
  scheduleOccurrenceKey: null,
  menuItems: [],
  pricingPolicy: {
    vatBasisPoints: 0,
    serviceBasisPoints: 0,
    deliveryMinor: 0,
    vatAllocation: 'proportional',
    serviceAllocation: 'proportional',
    deliveryAllocation: 'equal',
  },
  aggregate: {},
  responseSummary: {
    pending: 2,
    viewed: 0,
    ordering: 0,
    done: 0,
    skipped: 0,
    removed: 0,
    eligibleForFinalization: 0,
    total: 2,
  },
  settlementSummary: {
    participantCount: 0,
    expectedGrandTotalMinor: 0,
    outstandingGrandTotalMinor: 0,
    verifiedGrandTotalMinor: 0,
    settledParticipantCount: 0,
  },
  schemaVersion: 1,
  revision: 2,
  openedAt: NOW,
  lockedAt: null,
  submittedAt: null,
  confirmedAt: null,
  deliveredAt: null,
  settlingAt: null,
  settledAt: null,
  cancelledAt: null,
  createdAt: NOW,
  updatedAt: NOW,
});

const participantDocument = (userId: string) => ({
  userId,
  displayName: userId === OWNER_ID ? 'Owner' : 'Participant',
  identityKind: 'account',
  role: userId === OWNER_ID ? 'organizer' : 'participant',
  response: 'pending',
  includeInFinalOrder: false,
  firstViewedAt: null,
  completedAt: null,
  skippedAt: null,
  removedAt: null,
  lastActivityAt: NOW,
  reminderCount: 0,
  lastReminderAt: null,
  revision: 1,
  joinedAt: NOW,
  updatedAt: NOW,
});

const seedSession = async (): Promise<void> => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    await setDoc(doc(database, 'orderSessions', SESSION_ID), sessionDocument());
    await setDoc(
      doc(database, 'orderSessions', SESSION_ID, 'participants', OWNER_ID),
      participantDocument(OWNER_ID),
    );
    await setDoc(
      doc(database, 'orderSessions', SESSION_ID, 'participants', PARTICIPANT_ID),
      participantDocument(PARTICIPANT_ID),
    );
    await setDoc(
      doc(database, 'orderSessions', SESSION_ID, 'contributions', PARTICIPANT_ID),
      {
        sessionId: SESSION_ID,
        userId: PARTICIPANT_ID,
        displayName: 'Participant',
        quantities: { item_1: 1 },
        revision: 1,
        lastMutationId: 'mutation-1',
        updatedAt: NOW,
      },
    );
    await setDoc(
      doc(database, 'orderSessions', SESSION_ID, 'mutations', 'mutation-1'),
      {
        id: 'mutation-1',
        sessionId: SESSION_ID,
        userId: PARTICIPANT_ID,
        itemId: 'item_1',
        operation: 'set',
        requestedValue: 1,
        appliedDelta: 1,
        resultQuantity: 1,
        resultRevision: 1,
        createdAt: NOW,
      },
    );
    await setDoc(
      doc(database, 'orderSessions', SESSION_ID, 'activity', 'event-1'),
      {
        id: 'event-1',
        sessionId: SESSION_ID,
        actorId: PARTICIPANT_ID,
        actorDisplayName: 'Participant',
        type: 'contribution_updated',
        metadata: { itemId: 'item_1', quantity: '1' },
        createdAt: NOW,
      },
    );
    await setDoc(
      doc(database, 'orderSessions', SESSION_ID, 'settlement', PARTICIPANT_ID),
      {
        sessionId: SESSION_ID,
        userId: PARTICIPANT_ID,
        expectedTotalMinor: 100,
        outstandingMinor: 100,
        status: 'unpaid',
      },
    );
  });
};

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: await readFile('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seedSession();
});

afterAll(async () => {
  await environment.cleanup();
});

const authenticatedDatabase = (userId: string) =>
  environment.authenticatedContext(userId, {
    email: `${userId}@example.com`,
  }).firestore();

const anonymousDatabase = () => environment.unauthenticatedContext().firestore();

const sessionPaths = (userId: string) => [
  doc(authenticatedDatabase(userId), 'orderSessions', SESSION_ID),
  doc(
    authenticatedDatabase(userId),
    'orderSessions',
    SESSION_ID,
    'participants',
    userId,
  ),
  doc(
    authenticatedDatabase(userId),
    'orderSessions',
    SESSION_ID,
    'contributions',
    PARTICIPANT_ID,
  ),
  doc(
    authenticatedDatabase(userId),
    'orderSessions',
    SESSION_ID,
    'mutations',
    'mutation-1',
  ),
  doc(
    authenticatedDatabase(userId),
    'orderSessions',
    SESSION_ID,
    'activity',
    'event-1',
  ),
  doc(
    authenticatedDatabase(userId),
    'orderSessions',
    SESSION_ID,
    'settlement',
    PARTICIPANT_ID,
  ),
];

describe('order session Firestore rules', () => {
  it.each([OWNER_ID, PARTICIPANT_ID, OTHER_ID])(
    'denies every direct document read for authenticated user %s',
    async (userId) => {
      for (const reference of sessionPaths(userId)) {
        await expect(assertFails(getDoc(reference))).resolves.toMatchObject({
          code: 'permission-denied',
        });
      }
    },
  );

  it('denies unauthenticated top-level and participant reads', async () => {
    const database = anonymousDatabase();
    await expect(
      assertFails(getDoc(doc(database, 'orderSessions', SESSION_ID))),
    ).resolves.toMatchObject({ code: 'permission-denied' });
    await expect(
      assertFails(
        getDoc(
          doc(
            database,
            'orderSessions',
            SESSION_ID,
            'participants',
            PARTICIPANT_ID,
          ),
        ),
      ),
    ).resolves.toMatchObject({ code: 'permission-denied' });
  });

  it.each([OWNER_ID, PARTICIPANT_ID, OTHER_ID])(
    'denies direct session enumeration for authenticated user %s',
    async (userId) => {
      await expect(
        assertFails(
          getDocs(collection(authenticatedDatabase(userId), 'orderSessions')),
        ),
      ).resolves.toMatchObject({ code: 'permission-denied' });
    },
  );

  it.each([OWNER_ID, PARTICIPANT_ID, OTHER_ID])(
    'denies every direct document write for authenticated user %s',
    async (userId) => {
      const database = authenticatedDatabase(userId);
      await expect(
        assertFails(
          setDoc(doc(database, 'orderSessions', 'client-forged-session'), {
            ...sessionDocument(),
            id: 'client-forged-session',
            organizerId: userId,
          }),
        ),
      ).resolves.toMatchObject({ code: 'permission-denied' });
      await expect(
        assertFails(
          setDoc(
            doc(
              database,
              'orderSessions',
              SESSION_ID,
              'participants',
              userId,
            ),
            participantDocument(userId),
          ),
        ),
      ).resolves.toMatchObject({ code: 'permission-denied' });
      await expect(
        assertFails(
          setDoc(
            doc(
              database,
              'orderSessions',
              SESSION_ID,
              'settlement',
              userId,
            ),
            {
              sessionId: SESSION_ID,
              userId,
              expectedTotalMinor: 0,
              outstandingMinor: 0,
              status: 'verified',
            },
          ),
        ),
      ).resolves.toMatchObject({ code: 'permission-denied' });
    },
  );
});
