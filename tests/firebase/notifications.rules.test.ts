import { readFile } from 'node:fs/promises';

import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const PROJECT_ID = 'food-order-v1-rules-test';
const USER_ID = 'notification-user';
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
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(
        context.firestore(),
        'users',
        USER_ID,
        'notifications',
        'notification-1',
      ),
      {
        id: 'notification-1',
        kind: 'friend_request',
        title: 'New friend request',
        message: 'A user sent you a friend request.',
        route: '/social',
        entityType: 'friend',
        entityId: 'friend-1',
        actorId: 'friend-1',
        actorName: 'Friend',
        createdAt: '2026-07-16T10:00:00.000Z',
        readAt: null,
      },
    );
  });
});

afterAll(async () => {
  await environment.cleanup();
});

describe('trusted notification rules', () => {
  it('prevents clients from reading or forging notification records', async () => {
    const database = environment
      .authenticatedContext(USER_ID, { email: 'user@example.com' })
      .firestore();
    const reference = doc(
      database,
      'users',
      USER_ID,
      'notifications',
      'notification-1',
    );

    await expect(assertFails(getDoc(reference))).resolves.toMatchObject({
      code: 'permission-denied',
    });
    await expect(
      assertFails(setDoc(reference, { readAt: '2026-07-16T11:00:00.000Z' }, { merge: true })),
    ).resolves.toMatchObject({ code: 'permission-denied' });
  });
});
