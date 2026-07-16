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

const PROJECT_ID = 'food-order-v1-social-rules-test';
const USER_ID = 'social-user';
const OTHER_ID = 'other-user';
let environment: RulesTestEnvironment;

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

describe('social graph security rules', () => {
  it('allows an account to publish but not read its own search directory entry', async () => {
    const database = environment
      .authenticatedContext(USER_ID, { email: 'user@example.com' })
      .firestore();
    const reference = doc(database, 'publicProfiles', USER_ID);

    await assertSucceeds(
      setDoc(reference, {
        userId: USER_ID,
        displayName: 'User',
        email: 'user@example.com',
        emailNormalized: 'user@example.com',
        updatedAt: '2026-07-14T12:00:00.000Z',
      }),
    );
    await expect(assertFails(getDoc(reference))).resolves.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('prevents another account from publishing a directory entry for the user', async () => {
    const database = environment
      .authenticatedContext(OTHER_ID, { email: 'other@example.com' })
      .firestore();

    await expect(
      assertFails(
        setDoc(doc(database, 'publicProfiles', USER_ID), {
          userId: USER_ID,
          displayName: 'Forged',
          email: 'user@example.com',
          emailNormalized: 'user@example.com',
          updatedAt: '2026-07-14T12:00:00.000Z',
        }),
      ),
    ).resolves.toMatchObject({ code: 'permission-denied' });
  });

  it('lets users read their own social mirrors but never mutate them directly', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'users', USER_ID, 'friends', OTHER_ID),
        {
          userId: OTHER_ID,
          displayName: 'Other',
          email: 'other@example.com',
        },
      );
    });
    const database = environment
      .authenticatedContext(USER_ID, { email: 'user@example.com' })
      .firestore();
    const reference = doc(database, 'users', USER_ID, 'friends', OTHER_ID);

    const snapshot = await assertSucceeds(getDoc(reference));
    expect(snapshot.exists()).toBe(true);
    await expect(
      assertFails(
        setDoc(reference, {
          userId: OTHER_ID,
          displayName: 'Forged',
          email: 'forged@example.com',
        }),
      ),
    ).resolves.toMatchObject({ code: 'permission-denied' });
  });

  it('keeps friend groups and bucket grants callable-only', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const database = context.firestore();
      await setDoc(doc(database, 'friendGroups', 'group-1'), {
        id: 'group-1',
        ownerId: USER_ID,
        name: 'Company',
      });
      await setDoc(
        doc(database, 'buckets', 'bucket-1', 'accessGrants', 'group_group-1'),
        {
          id: 'group_group-1',
          bucketId: 'bucket-1',
          subjectType: 'group',
          subjectId: 'group-1',
        },
      );
    });
    const database = environment
      .authenticatedContext(USER_ID, { email: 'user@example.com' })
      .firestore();

    await expect(
      assertFails(getDoc(doc(database, 'friendGroups', 'group-1'))),
    ).resolves.toMatchObject({ code: 'permission-denied' });
    await expect(
      assertFails(
        getDoc(
          doc(
            database,
            'buckets',
            'bucket-1',
            'accessGrants',
            'group_group-1',
          ),
        ),
      ),
    ).resolves.toMatchObject({ code: 'permission-denied' });
  });

  it('keeps targeted bucket invitation mirrors callable-only', async () => {
    const bucketId = 'bucket-invitation';
    const invitation = {
      id: 'bucket-invitation_other-user',
      bucketId,
      bucketTitle: 'Private lunch',
      owner: {
        userId: USER_ID,
        displayName: 'Owner',
        email: 'user@example.com',
      },
      recipient: {
        userId: OTHER_ID,
        displayName: 'Recipient',
        email: 'other@example.com',
      },
      role: 'contributor',
      status: 'pending',
      createdAt: '2026-07-16T12:00:00.000Z',
      respondedAt: null,
    };
    await environment.withSecurityRulesDisabled(async (context) => {
      const database = context.firestore();
      await setDoc(
        doc(
          database,
          'buckets',
          bucketId,
          'socialInvitations',
          OTHER_ID,
        ),
        invitation,
      );
      await setDoc(
        doc(
          database,
          'users',
          OTHER_ID,
          'bucketInvitations',
          bucketId,
        ),
        invitation,
      );
    });

    const recipientDatabase = environment
      .authenticatedContext(OTHER_ID, { email: 'other@example.com' })
      .firestore();
    const mirrorReference = doc(
      recipientDatabase,
      'users',
      OTHER_ID,
      'bucketInvitations',
      bucketId,
    );
    await expect(assertFails(getDoc(mirrorReference))).resolves.toMatchObject({
      code: 'permission-denied',
    });
    await expect(
      assertFails(
        setDoc(mirrorReference, { status: 'accepted' }, { merge: true }),
      ),
    ).resolves.toMatchObject({ code: 'permission-denied' });

    const ownerDatabase = environment
      .authenticatedContext(USER_ID, { email: 'user@example.com' })
      .firestore();
    const canonicalReference = doc(
      ownerDatabase,
      'buckets',
      bucketId,
      'socialInvitations',
      OTHER_ID,
    );
    await expect(
      assertFails(getDoc(canonicalReference)),
    ).resolves.toMatchObject({ code: 'permission-denied' });
    await expect(
      assertFails(
        setDoc(canonicalReference, { status: 'accepted' }, { merge: true }),
      ),
    ).resolves.toMatchObject({ code: 'permission-denied' });
  });
});
