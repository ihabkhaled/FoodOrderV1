import {
  type Auth,
  doc,
  type DocumentReference,
  type FirebaseApp,
  type Firestore,
  getAuth,
  initializeApp,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from '@/packages/firebase';
import { env } from '@/platform/environment';
import { createId, nowIso } from '@/shared/helpers';

import type {
  Bucket,
  BucketActivityEvent,
  BucketActivityType,
  BucketMember,
  BucketMembershipRef,
  BucketRole,
  SessionUser,
} from '../types/domain.types';

interface FirebaseRuntime {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

let runtime: FirebaseRuntime | null = null;

export const getFirebaseRuntime = (): FirebaseRuntime => {
  if (!env.firebaseEnabled) throw new Error('Firebase is not configured.');
  if (!runtime) {
    const app = initializeApp(env.firebase);
    const firestore = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
    runtime = { app, auth: getAuth(app), firestore };
  }
  return runtime;
};

export const PERMISSION_ERROR = 'You do not have permission for this action.';

export const bucketRef = (firestore: Firestore, bucketId: string): DocumentReference =>
  doc(firestore, 'buckets', bucketId);
export const memberRef = (
  firestore: Firestore,
  bucketId: string,
  userId: string,
): DocumentReference => doc(firestore, 'buckets', bucketId, 'members', userId);
export const inviteRef = (
  firestore: Firestore,
  bucketId: string,
  inviteId: string,
): DocumentReference => doc(firestore, 'buckets', bucketId, 'invites', inviteId);
export const contributionRef = (
  firestore: Firestore,
  bucketId: string,
  userId: string,
): DocumentReference => doc(firestore, 'buckets', bucketId, 'contributions', userId);
export const mutationRef = (
  firestore: Firestore,
  bucketId: string,
  mutationId: string,
): DocumentReference => doc(firestore, 'buckets', bucketId, 'mutations', mutationId);
export const activityRef = (
  firestore: Firestore,
  bucketId: string,
  eventId: string,
): DocumentReference => doc(firestore, 'buckets', bucketId, 'activity', eventId);
export const membershipRef = (
  firestore: Firestore,
  userId: string,
  bucketId: string,
): DocumentReference => doc(firestore, 'users', userId, 'bucketMemberships', bucketId);

export const activityEvent = (
  bucketId: string,
  actor: SessionUser,
  type: BucketActivityType,
  targetType: BucketActivityEvent['targetType'],
  targetId: string,
  metadata: Record<string, string> = {},
): BucketActivityEvent => ({
  id: createId('event'),
  bucketId,
  type,
  actorId: actor.id,
  actorName: actor.displayName,
  targetType,
  targetId,
  metadata,
  createdAt: nowIso(),
});

export const ownerMemberDoc = (owner: SessionUser): BucketMember => {
  const at = nowIso();
  return {
    userId: owner.id,
    displayName: owner.displayName,
    role: 'owner',
    status: 'active',
    invitedBy: owner.id,
    joinedAt: at,
    updatedAt: at,
  };
};

export const membershipDoc = (bucket: Bucket, role: BucketRole): BucketMembershipRef => ({
  bucketId: bucket.id,
  role,
  bucketTitle: bucket.title,
  ownerName: bucket.ownerName,
  joinedAt: nowIso(),
});
