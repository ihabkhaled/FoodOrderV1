import { readFile } from 'node:fs/promises';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const PROJECT_ID = 'food-order-v1-personal-pricing-rules-test';
const OWNER_ID = 'pricing-owner';
const EDITOR_ID = 'pricing-editor';
const BUCKET_ID = 'private-priced-bucket';
const NOW = '2026-07-15T02:00:00.000Z';

let environment: RulesTestEnvironment;

const pricingPolicy = {
  vatBasisPoints: 1400,
  serviceBasisPoints: 1200,
  deliveryMinor: 2500,
  vatAllocation: 'proportional',
  serviceAllocation: 'proportional',
  deliveryAllocation: 'equal',
};

const bucketDocument = () => ({
  id: BUCKET_ID,
  ownerId: OWNER_ID,
  ownerName: 'Owner',
  title: 'Private pricing',
  description: '',
  currency: 'EGP',
  visibility: 'private',
  status: 'active',
  schemaVersion: 3,
  revision: 1,
  orderState: 'open',
  customItemMode: 'proposal',
  pricingPolicy,
  frozenAt: null,
  frozenBy: null,
  aggregate: {},
  items: [
    {
      id: 'item-1',
      name: 'Meal',
      description: '',
      category: '',
      unitPrice: 100,
      active: true,
      sortOrder: 0,
    },
  ],
  createdAt: NOW,
  updatedAt: NOW,
});

const personalOrder = (participants: unknown = null) => ({
  id: 'order-1',
  userId: OWNER_ID,
  bucketId: BUCKET_ID,
  bucketTitle: 'Private pricing',
  status: 'placed',
  currency: 'EGP',
  lines: [
    {
      id: 'line-1',
      bucketItemId: 'item-1',
      name: 'Meal',
      quantity: 1,
      unitPrice: 100,
      lineTotal: 100,
    },
  ],
  notes: '',
  subtotal: 100,
  total: 151,
  sourceBucketRevision: 1,
  participants,
  groupReceipt: {
    currency: 'EGP',
    itemSubtotalMinor: 10_000,
    vatMinor: 1400,
    serviceMinor: 1200,
    deliveryMinor: 2500,
    grandTotalMinor: 15_100,
    participantReceipts: [{ userId: OWNER_ID }],
    items: [],
    pricingPolicy,
    bucketRevision: 1,
  },
  createdAt: NOW,
  updatedAt: NOW,
  placedAt: NOW,
  completedAt: null,
  cancelledAt: null,
});

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

describe('personal bucket pricing rules', () => {
  it('allows an owner to create a single-person priced order snapshot', async () => {
    const database = environment
      .authenticatedContext(OWNER_ID, { email: 'owner@example.com' })
      .firestore();

    await expect(
      assertSucceeds(
        setDoc(
          doc(database, 'users', OWNER_ID, 'orders', 'order-1'),
          personalOrder(),
        ),
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects a client-created multi-person group receipt', async () => {
    const database = environment
      .authenticatedContext(OWNER_ID, { email: 'owner@example.com' })
      .firestore();

    await expect(
      assertFails(
        setDoc(
          doc(database, 'users', OWNER_ID, 'orders', 'order-1'),
          personalOrder([{ userId: OWNER_ID }, { userId: EDITOR_ID }]),
        ),
      ),
    ).resolves.toMatchObject({ code: 'permission-denied' });
  });

  it('allows an active editor to update bucket pricing in the edit form', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const database = context.firestore();
      await setDoc(doc(database, 'buckets', BUCKET_ID), bucketDocument());
      await setDoc(doc(database, 'buckets', BUCKET_ID, 'members', EDITOR_ID), {
        userId: EDITOR_ID,
        displayName: 'Editor',
        email: 'editor@example.com',
        role: 'editor',
        status: 'active',
        invitedBy: OWNER_ID,
        joinedAt: NOW,
        updatedAt: NOW,
      });
    });

    const database = environment
      .authenticatedContext(EDITOR_ID, { email: 'editor@example.com' })
      .firestore();
    await expect(
      assertSucceeds(
        setDoc(doc(database, 'buckets', BUCKET_ID), {
          ...bucketDocument(),
          pricingPolicy: {
            ...pricingPolicy,
            vatBasisPoints: 1000,
            deliveryMinor: 1500,
          },
          revision: 2,
          updatedAt: '2026-07-15T02:01:00.000Z',
        }),
      ),
    ).resolves.toBeUndefined();
  });
});
