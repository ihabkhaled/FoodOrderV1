import { readFile } from 'node:fs/promises';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  runTransaction,
  setDoc,
} from 'firebase/firestore';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

const PROJECT_ID = 'food-order-v1-rules-test';
const BUCKET_ID = 'bucket-shared';
const INVITE_ID = 'invite-hash';
const OWNER_ID = 'owner-user';
const INVITEE_ID = 'invitee-user';
const OTHER_ID = 'other-user';
const NOW = '2026-07-13T15:00:00.000Z';

let environment: RulesTestEnvironment;

const pricingPolicy = {
  vatBasisPoints: 0,
  serviceBasisPoints: 0,
  deliveryMinor: 0,
  vatAllocation: 'proportional',
  serviceAllocation: 'proportional',
  deliveryAllocation: 'equal',
};

const bucketDocument = (orderState: 'open' | 'frozen' = 'open') => ({
  id: BUCKET_ID,
  ownerId: OWNER_ID,
  ownerName: 'Owner',
  title: 'Shared lunch',
  description: '',
  currency: 'EGP',
  visibility: 'shared',
  status: 'active',
  schemaVersion: 3,
  revision: 1,
  orderState,
  customItemMode: 'proposal',
  pricingPolicy,
  frozenAt: orderState === 'frozen' ? NOW : null,
  frozenBy: orderState === 'frozen' ? OWNER_ID : null,
  aggregate: { item_1: 0 },
  items: [
    {
      id: 'item_1',
      name: 'Meal',
      description: '',
      category: 'Main',
      unitPrice: 100,
      active: true,
      sortOrder: 0,
    },
  ],
  createdAt: NOW,
  updatedAt: NOW,
});

const pendingInvite = () => ({
  id: INVITE_ID,
  bucketId: BUCKET_ID,
  bucketTitle: 'Shared lunch',
  ownerName: 'Owner',
  role: 'contributor',
  status: 'pending',
  createdBy: OWNER_ID,
  createdAt: NOW,
  expiresAt: '2099-01-01T00:00:00.000Z',
  expiresAtMillis: 4_071_000_000_000,
  acceptedBy: null,
  acceptedAt: null,
  revokedAt: null,
});

const seedJoinData = async (orderState: 'open' | 'frozen' = 'open'): Promise<void> => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    await setDoc(doc(database, 'buckets', BUCKET_ID), bucketDocument(orderState));
    await setDoc(
      doc(database, 'buckets', BUCKET_ID, 'members', OWNER_ID),
      {
        userId: OWNER_ID,
        displayName: 'Owner',
        email: 'owner@example.com',
        role: 'owner',
        status: 'active',
        invitedBy: OWNER_ID,
        joinedAt: NOW,
        updatedAt: NOW,
      },
    );
    await setDoc(
      doc(database, 'buckets', BUCKET_ID, 'invites', INVITE_ID),
      pendingInvite(),
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
});

afterAll(async () => {
  await environment.cleanup();
});

describe('bucket invite acceptance rules', () => {
  it('allows an invitee to read only their own missing membership document', async () => {
    await seedJoinData();
    const database = environment
      .authenticatedContext(INVITEE_ID, { email: 'invitee@example.com' })
      .firestore();

    const ownMembership = await assertSucceeds(
      getDoc(doc(database, 'buckets', BUCKET_ID, 'members', INVITEE_ID)),
    );
    expect(ownMembership.exists()).toBe(false);

    await expect(
      assertFails(getDoc(doc(database, 'buckets', BUCKET_ID, 'members', OTHER_ID))),
    ).resolves.toBeUndefined();
  });

  it('accepts a pending invite atomically and grants bucket access', async () => {
    await seedJoinData();
    const database = environment
      .authenticatedContext(INVITEE_ID, { email: 'invitee@example.com' })
      .firestore();

    await assertSucceeds(
      runTransaction(database, async (transaction) => {
        const inviteReference = doc(
          database,
          'buckets',
          BUCKET_ID,
          'invites',
          INVITE_ID,
        );
        const memberReference = doc(
          database,
          'buckets',
          BUCKET_ID,
          'members',
          INVITEE_ID,
        );
        const mirrorReference = doc(
          database,
          'users',
          INVITEE_ID,
          'bucketMemberships',
          BUCKET_ID,
        );
        const activityReference = doc(
          database,
          'buckets',
          BUCKET_ID,
          'activity',
          'join-event',
        );

        const invite = await transaction.get(inviteReference);
        expect(invite.exists()).toBe(true);
        await transaction.get(memberReference);

        transaction.set(memberReference, {
          userId: INVITEE_ID,
          displayName: 'Invitee',
          email: 'invitee@example.com',
          role: 'contributor',
          status: 'active',
          invitedBy: OWNER_ID,
          joinedAt: NOW,
          updatedAt: NOW,
          inviteId: INVITE_ID,
        });
        transaction.update(inviteReference, {
          status: 'accepted',
          acceptedBy: INVITEE_ID,
          acceptedAt: NOW,
        });
        transaction.set(mirrorReference, {
          bucketId: BUCKET_ID,
          role: 'contributor',
          bucketTitle: 'Shared lunch',
          ownerName: 'Owner',
          joinedAt: NOW,
        });
        transaction.set(activityReference, {
          id: 'join-event',
          bucketId: BUCKET_ID,
          type: 'member_joined',
          actorId: INVITEE_ID,
          actorName: 'Invitee',
          targetType: 'member',
          targetId: INVITEE_ID,
          metadata: { role: 'contributor' },
          createdAt: NOW,
        });
      }),
    );

    const bucket = await assertSucceeds(
      getDoc(doc(database, 'buckets', BUCKET_ID)),
    );
    expect(bucket.exists()).toBe(true);
  });

  it('rejects reusing an accepted invite', async () => {
    await seedJoinData();
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'buckets', BUCKET_ID, 'invites', INVITE_ID),
        {
          ...pendingInvite(),
          status: 'accepted',
          acceptedBy: OTHER_ID,
          acceptedAt: NOW,
        },
      );
    });
    const database = environment
      .authenticatedContext(INVITEE_ID, { email: 'invitee@example.com' })
      .firestore();

    await expect(
      assertFails(
        setDoc(
          doc(database, 'buckets', BUCKET_ID, 'invites', INVITE_ID),
          {
            status: 'accepted',
            acceptedBy: INVITEE_ID,
            acceptedAt: NOW,
          },
          { merge: true },
        ),
      ),
    ).resolves.toBeUndefined();
  });
});

describe('frozen bucket permissions', () => {
  it('rejects contribution writes after freezing', async () => {
    await seedJoinData('frozen');
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'buckets', BUCKET_ID, 'members', INVITEE_ID),
        {
          userId: INVITEE_ID,
          displayName: 'Invitee',
          email: 'invitee@example.com',
          role: 'contributor',
          status: 'active',
          invitedBy: OWNER_ID,
          joinedAt: NOW,
          updatedAt: NOW,
        },
      );
    });
    const database = environment
      .authenticatedContext(INVITEE_ID, { email: 'invitee@example.com' })
      .firestore();

    await expect(
      assertFails(
        setDoc(
          doc(database, 'buckets', BUCKET_ID, 'contributions', INVITEE_ID),
          {
            userId: INVITEE_ID,
            displayName: 'Invitee',
            bucketId: BUCKET_ID,
            quantities: { item_1: 1 },
            revision: 1,
            updatedAt: NOW,
          },
        ),
      ),
    ).resolves.toBeUndefined();
  });
});
