import { readFile } from 'node:fs/promises';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const PROJECT_ID = 'food-order-v1-invite-link-rules-test';
const CREATOR_ID = 'link-creator';
const REDEEMER_ID = 'link-redeemer';
const TOKEN = 'a'.repeat(32);

let environment: RulesTestEnvironment;

const seedLink = async (overrides: Record<string, unknown> = {}) => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'inviteLinks', TOKEN), {
      token: TOKEN,
      kind: 'friend',
      createdBy: CREATOR_ID,
      createdByName: 'Creator',
      createdAt: '2026-08-26T10:00:00.000Z',
      expiresAt: '2099-01-01T00:00:00.000Z',
      revoked: false,
      ...overrides,
    });
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

describe('invite link security rules', () => {
  it('lets a creator read their own link so the UI can list and revoke it', async () => {
    await seedLink();
    const database = environment.authenticatedContext(CREATOR_ID).firestore();
    const snapshot = await assertSucceeds(getDoc(doc(database, 'inviteLinks', TOKEN)));
    expect(snapshot.data()).toMatchObject({ createdBy: CREATOR_ID, kind: 'friend' });
  });

  it('hides a link from everyone except its creator', async () => {
    await seedLink();
    const database = environment.authenticatedContext(REDEEMER_ID).firestore();
    // The redeemer never reads the document: redemption goes through the
    // callable, which holds admin rights. A direct read would let anyone who
    // guessed a token inspect what it grants.
    await expect(assertFails(getDoc(doc(database, 'inviteLinks', TOKEN)))).resolves.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('refuses an anonymous read', async () => {
    await seedLink();
    const database = environment.unauthenticatedContext().firestore();
    await expect(assertFails(getDoc(doc(database, 'inviteLinks', TOKEN)))).resolves.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('never allows listing, so live tokens cannot be enumerated', async () => {
    await seedLink();
    const database = environment.authenticatedContext(CREATOR_ID).firestore();
    await expect(
      assertFails(getDocs(collection(database, 'inviteLinks'))),
    ).resolves.toMatchObject({ code: 'permission-denied' });
  });

  it('blocks client writes, including by the creator', async () => {
    await seedLink();
    const database = environment.authenticatedContext(CREATOR_ID).firestore();
    const reference = doc(database, 'inviteLinks', TOKEN);

    // Every mutation is a callable's job. A client that could write here could
    // mint itself a link to any bucket or group.
    await expect(
      assertFails(setDoc(doc(database, 'inviteLinks', 'b'.repeat(32)), {
        token: 'b'.repeat(32),
        kind: 'bucket',
        createdBy: CREATOR_ID,
        bucketId: 'someone-elses-bucket',
        role: 'owner',
        revoked: false,
        expiresAt: '2099-01-01T00:00:00.000Z',
      })),
    ).resolves.toMatchObject({ code: 'permission-denied' });

    await expect(
      assertFails(setDoc(reference, { revoked: true }, { merge: true })),
    ).resolves.toMatchObject({ code: 'permission-denied' });

    await expect(assertFails(deleteDoc(reference))).resolves.toMatchObject({
      code: 'permission-denied',
    });
  });
});
