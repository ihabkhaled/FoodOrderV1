import { createBucket, updateBucket, upgradeLegacyBucket } from '@/lib/bucket';
import { nowIso } from '@/lib/date';
import { createId } from '@/lib/id';
import { createOrder, transitionOrder } from '@/lib/order';
import {
  applyContributionMutation,
  assertAssignableRole,
  buildGroupOrderLines,
  buildJoinCode,
  computeAggregate,
  detectAggregateDrift,
  generateInviteToken,
  hashInviteToken,
  inviteExpiryIso,
  inviteExpiryMillis,
  isInviteUsable,
  MAX_BUCKET_MEMBERS,
  memberCan,
  parseJoinCode,
  toOrderParticipants,
} from '@/lib/sharing';
import {
  type Auth,
  collection,
  createUserWithEmailAndPassword,
  deleteDoc,
  deleteUser,
  doc,
  type DocumentReference,
  type FirebaseApp,
  type Firestore,
  getAuth,
  getDoc,
  getDocs,
  initializeApp,
  initializeFirestore,
  limit,
  onAuthStateChanged,
  orderBy,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  runTransaction,
  sendPasswordResetEmail,
  setDoc,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  where,
  writeBatch,
} from '@/packages/firebase';
import { env } from '@/platform/environment';
import type {
  AuthService,
  DataService,
  SharedBucketView,
  SharingService,
  UserDataExport,
} from '@/services/contracts';
import type {
  Bucket,
  BucketActivityEvent,
  BucketActivityType,
  BucketContribution,
  BucketDraft,
  BucketInvite,
  BucketMember,
  BucketMembershipRef,
  BucketRole,
  ContributionMutationRecord,
  ContributionOperation,
  DashboardSummary,
  Order,
  OrderDraft,
  OrderStatus,
  ProfileDefaults,
  SessionUser,
  UserProfile,
} from '@/types/domain';

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

const sessionUser = (user: { uid: string; email: string | null; displayName: string | null }): SessionUser => ({
  id: user.uid,
  email: user.email ?? '',
  displayName: user.displayName ?? user.email?.split('@')[0] ?? 'User',
  isDemo: false,
});

const PERMISSION_ERROR = 'You do not have permission for this action.';

export class FirebaseAuthService implements AuthService {
  subscribe(listener: (user: SessionUser | null) => void): () => void {
    return onAuthStateChanged(getFirebaseRuntime().auth, (user) => { listener(user ? sessionUser(user) : null); });
  }

  async login(email: string, password: string): Promise<SessionUser> {
    const result = await signInWithEmailAndPassword(getFirebaseRuntime().auth, email, password);
    return sessionUser(result.user);
  }

  async register(
    fullName: string,
    email: string,
    password: string,
    defaults: ProfileDefaults,
  ): Promise<SessionUser> {
    const { auth, firestore } = getFirebaseRuntime();
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: fullName.trim() });
    const createdAt = nowIso();
    const profile: UserProfile = {
      id: result.user.uid,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      locale: defaults.locale,
      theme: defaults.theme,
      defaultCurrency: defaults.defaultCurrency,
      createdAt,
      updatedAt: createdAt,
    };
    await setDoc(doc(firestore, 'users', result.user.uid), profile);
    return sessionUser(result.user);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(getFirebaseRuntime().auth, email);
  }

  async logout(): Promise<void> {
    await signOut(getFirebaseRuntime().auth);
  }

  async deleteAccount(user: SessionUser): Promise<void> {
    const current = getFirebaseRuntime().auth.currentUser;
    if (!current || current.uid !== user.id) throw new Error('You must be signed in to delete this account.');
    // Firebase requires a recent login; the requires-recent-login error surfaces to the UI.
    await deleteUser(current);
  }
}

const bucketRef = (firestore: Firestore, bucketId: string): DocumentReference =>
  doc(firestore, 'buckets', bucketId);
const memberRef = (firestore: Firestore, bucketId: string, userId: string): DocumentReference =>
  doc(firestore, 'buckets', bucketId, 'members', userId);
const inviteRef = (firestore: Firestore, bucketId: string, inviteId: string): DocumentReference =>
  doc(firestore, 'buckets', bucketId, 'invites', inviteId);
const contributionRef = (
  firestore: Firestore,
  bucketId: string,
  userId: string,
): DocumentReference => doc(firestore, 'buckets', bucketId, 'contributions', userId);
const mutationRef = (
  firestore: Firestore,
  bucketId: string,
  mutationId: string,
): DocumentReference => doc(firestore, 'buckets', bucketId, 'mutations', mutationId);
const activityRef = (firestore: Firestore, bucketId: string, eventId: string): DocumentReference =>
  doc(firestore, 'buckets', bucketId, 'activity', eventId);
const membershipRef = (
  firestore: Firestore,
  userId: string,
  bucketId: string,
): DocumentReference => doc(firestore, 'users', userId, 'bucketMemberships', bucketId);

const activityEvent = (
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

const ownerMemberDoc = (owner: SessionUser): BucketMember => {
  const at = nowIso();
  return {
    userId: owner.id,
    displayName: owner.displayName,
    email: owner.email,
    role: 'owner',
    status: 'active',
    invitedBy: owner.id,
    joinedAt: at,
    updatedAt: at,
  };
};

const membershipDoc = (bucket: Bucket, role: BucketRole): BucketMembershipRef => ({
  bucketId: bucket.id,
  role,
  bucketTitle: bucket.title,
  ownerName: bucket.ownerName,
  joinedAt: nowIso(),
});

export class FirestoreDataService implements DataService {
  private get firestore(): Firestore {
    return getFirebaseRuntime().firestore;
  }

  async getProfile(user: SessionUser, defaults: ProfileDefaults): Promise<UserProfile> {
    const reference = doc(this.firestore, 'users', user.id);
    const snapshot = await getDoc(reference);
    if (snapshot.exists()) return snapshot.data() as UserProfile;
    const createdAt = nowIso();
    const profile: UserProfile = {
      id: user.id,
      fullName: user.displayName,
      email: user.email,
      locale: defaults.locale,
      theme: defaults.theme,
      defaultCurrency: defaults.defaultCurrency,
      createdAt,
      updatedAt: createdAt,
    };
    await setDoc(reference, profile);
    return profile;
  }

  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    const saved = { ...profile, updatedAt: nowIso() };
    await setDoc(doc(this.firestore, 'users', profile.id), saved, { merge: true });
    return saved;
  }

  /** One-time lazy migration of legacy `users/{uid}/buckets` docs to `buckets/{id}`. */
  private async migrateLegacyBuckets(user: SessionUser): Promise<void> {
    const legacySnapshot = await getDocs(collection(this.firestore, 'users', user.id, 'buckets'));
    if (legacySnapshot.empty) return;
    const batch = writeBatch(this.firestore);
    for (const legacyDoc of legacySnapshot.docs) {
      const upgraded = upgradeLegacyBucket(legacyDoc.data(), {
        id: user.id,
        displayName: user.displayName,
      });
      batch.set(bucketRef(this.firestore, upgraded.id), upgraded);
      batch.set(memberRef(this.firestore, upgraded.id, user.id), ownerMemberDoc(user));
      batch.set(membershipRef(this.firestore, user.id, upgraded.id), membershipDoc(upgraded, 'owner'));
      batch.delete(legacyDoc.ref);
    }
    await batch.commit();
  }

  async listBuckets(user: SessionUser): Promise<Bucket[]> {
    await this.migrateLegacyBuckets(user);
    const snapshot = await getDocs(
      query(collection(this.firestore, 'buckets'), where('ownerId', '==', user.id)),
    );
    return snapshot.docs
      .map((item) => item.data() as Bucket)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getBucket(_user: SessionUser, bucketId: string): Promise<Bucket | null> {
    // Access control is enforced by Security Rules (owner or active member).
    const snapshot = await getDoc(bucketRef(this.firestore, bucketId));
    return snapshot.exists() ? (snapshot.data() as Bucket) : null;
  }

  async createBucket(user: SessionUser, draft: BucketDraft): Promise<Bucket> {
    const bucket = createBucket({ id: user.id, displayName: user.displayName }, draft);
    const batch = writeBatch(this.firestore);
    batch.set(bucketRef(this.firestore, bucket.id), bucket);
    batch.set(memberRef(this.firestore, bucket.id, user.id), ownerMemberDoc(user));
    batch.set(membershipRef(this.firestore, user.id, bucket.id), membershipDoc(bucket, 'owner'));
    await batch.commit();
    return bucket;
  }

  async updateBucket(user: SessionUser, bucketId: string, draft: BucketDraft): Promise<Bucket> {
    const existingSnap = await getDoc(bucketRef(this.firestore, bucketId));
    if (!existingSnap.exists()) throw new Error('Bucket was not found.');
    const existing = existingSnap.data() as Bucket;
    if (existing.ownerId !== user.id) {
      const memberSnap = await getDoc(memberRef(this.firestore, bucketId, user.id));
      const member = memberSnap.exists() ? (memberSnap.data() as BucketMember) : null;
      if (!memberCan(member, 'editBucket')) throw new Error(PERMISSION_ERROR);
    }
    const saved = updateBucket(existing, draft);
    const batch = writeBatch(this.firestore);
    batch.set(bucketRef(this.firestore, bucketId), saved);
    if (saved.visibility === 'shared') {
      const event = activityEvent(bucketId, user, 'bucket_updated', 'bucket', bucketId, {
        title: saved.title,
      });
      batch.set(activityRef(this.firestore, bucketId, event.id), event);
    }
    await batch.commit();
    return saved;
  }

  async deleteBucket(user: SessionUser, bucketId: string): Promise<void> {
    const snapshot = await getDoc(bucketRef(this.firestore, bucketId));
    if (!snapshot.exists()) return;
    const bucket = snapshot.data() as Bucket;
    if (bucket.ownerId !== user.id) throw new Error(PERMISSION_ERROR);
    const subcollections = ['members', 'invites', 'contributions', 'mutations', 'activity'];
    const batch = writeBatch(this.firestore);
    for (const name of subcollections) {
      const docs = await getDocs(collection(this.firestore, 'buckets', bucketId, name));
      for (const item of docs.docs) batch.delete(item.ref);
    }
    batch.delete(bucketRef(this.firestore, bucketId));
    batch.delete(membershipRef(this.firestore, user.id, bucketId));
    await batch.commit();
  }

  async listOrders(userId: string): Promise<Order[]> {
    const snapshot = await getDocs(collection(this.firestore, 'users', userId, 'orders'));
    return snapshot.docs.map((item) => item.data() as Order).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getOrder(userId: string, orderId: string): Promise<Order | null> {
    const snapshot = await getDoc(doc(this.firestore, 'users', userId, 'orders', orderId));
    return snapshot.exists() ? (snapshot.data() as Order) : null;
  }

  async createOrder(userId: string, draft: OrderDraft): Promise<Order> {
    const order = createOrder(userId, draft);
    await setDoc(doc(this.firestore, 'users', userId, 'orders', order.id), order);
    return order;
  }

  async updateOrderStatus(userId: string, orderId: string, status: OrderStatus): Promise<Order> {
    const existing = await this.getOrder(userId, orderId);
    if (!existing) throw new Error('Order was not found.');
    const saved = transitionOrder(existing, status);
    await setDoc(doc(this.firestore, 'users', userId, 'orders', orderId), saved);
    return saved;
  }

  async deleteOrder(userId: string, orderId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'users', userId, 'orders', orderId));
  }

  async getDashboard(user: SessionUser): Promise<DashboardSummary> {
    const [buckets, orders, memberships] = await Promise.all([
      this.listBuckets(user),
      this.listOrders(user.id),
      getDocs(collection(this.firestore, 'users', user.id, 'bucketMemberships')),
    ]);
    const sharedBucketCount = memberships.docs
      .map((item) => item.data() as BucketMembershipRef)
      .filter((membership) => membership.role !== 'owner').length;
    return {
      bucketCount: buckets.length,
      sharedBucketCount,
      activeItemCount: buckets.reduce((count, bucket) => count + bucket.items.filter((item) => item.active).length, 0),
      orderCount: orders.length,
      placedOrderCount: orders.filter((order) => order.status === 'placed').length,
      completedOrderCount: orders.filter((order) => order.status === 'completed').length,
      recentOrders: orders.slice(0, 5),
    };
  }

  async exportUserData(user: SessionUser, defaults: ProfileDefaults): Promise<UserDataExport> {
    const [profile, buckets, orders, membershipsSnap] = await Promise.all([
      this.getProfile(user, defaults),
      this.listBuckets(user),
      this.listOrders(user.id),
      getDocs(collection(this.firestore, 'users', user.id, 'bucketMemberships')),
    ]);
    const memberships = membershipsSnap.docs
      .map((item) => item.data() as BucketMembershipRef)
      .filter((membership) => membership.role !== 'owner')
      .map((membership) => ({
        bucketId: membership.bucketId,
        bucketTitle: membership.bucketTitle,
        role: membership.role,
      }));
    return { exportedAt: nowIso(), profile, buckets, orders, memberships };
  }

  async deleteAllUserData(user: SessionUser): Promise<void> {
    // Owned buckets cascade their subcollections through deleteBucket.
    const buckets = await this.listBuckets(user);
    for (const bucket of buckets) await this.deleteBucket(user, bucket.id);
    const [ordersSnap, membershipsSnap] = await Promise.all([
      getDocs(collection(this.firestore, 'users', user.id, 'orders')),
      getDocs(collection(this.firestore, 'users', user.id, 'bucketMemberships')),
    ]);
    const batch = writeBatch(this.firestore);
    for (const item of ordersSnap.docs) { batch.delete(item.ref); }
    for (const membership of membershipsSnap.docs) {
      const data = membership.data() as BucketMembershipRef;
      if (data.role !== 'owner') {
        // Leave other people's buckets; contributions stay in totals (product rule).
        batch.set(
          memberRef(this.firestore, data.bucketId, user.id),
          { status: 'left', updatedAt: nowIso() },
          { merge: true },
        );
      }
      batch.delete(membership.ref);
    }
    batch.delete(doc(this.firestore, 'users', user.id));
    await batch.commit();
  }
}

export class FirestoreSharingService implements SharingService {
  private get firestore(): Firestore {
    return getFirebaseRuntime().firestore;
  }

  async listSharedWithMe(user: SessionUser): Promise<Bucket[]> {
    const memberships = await getDocs(
      collection(this.firestore, 'users', user.id, 'bucketMemberships'),
    );
    const buckets: Bucket[] = [];
    for (const membership of memberships.docs) {
      const data = membership.data() as BucketMembershipRef;
      if (data.role === 'owner') continue;
      try {
        const snapshot = await getDoc(bucketRef(this.firestore, data.bucketId));
        if (snapshot.exists()) buckets.push(snapshot.data() as Bucket);
        else await deleteDoc(membership.ref); // bucket deleted → clean stale mirror
      } catch {
        await deleteDoc(membership.ref).catch(() => {}); // access revoked → clean mirror
      }
    }
    return buckets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getSharedBucketView(user: SessionUser, bucketId: string): Promise<SharedBucketView | null> {
    const bucketSnap = await getDoc(bucketRef(this.firestore, bucketId));
    if (!bucketSnap.exists()) return null;
    const bucket = bucketSnap.data() as Bucket;
    const [membersSnap, contributionsSnap] = await Promise.all([
      getDocs(collection(this.firestore, 'buckets', bucketId, 'members')),
      getDocs(collection(this.firestore, 'buckets', bucketId, 'contributions')),
    ]);
    const members = membersSnap.docs
      .map((item) => item.data() as BucketMember)
      .filter((member) => member.status === 'active');
    const me = members.find((member) => member.userId === user.id);
    const myRole: BucketRole | null = bucket.ownerId === user.id ? 'owner' : (me?.role ?? null);
    if (!myRole) return null;
    return {
      bucket,
      members,
      contributions: contributionsSnap.docs.map((item) => item.data() as BucketContribution),
      myRole,
    };
  }

  async enableSharing(user: SessionUser, bucketId: string): Promise<Bucket> {
    const shared = await runTransaction(this.firestore, async (tx) => {
      const snapshot = await tx.get(bucketRef(this.firestore, bucketId));
      if (!snapshot.exists()) throw new Error('Bucket was not found.');
      const bucket = snapshot.data() as Bucket;
      if (bucket.ownerId !== user.id) throw new Error(PERMISSION_ERROR);
      if (bucket.visibility === 'shared') return bucket;
      const next: Bucket = {
        ...bucket,
        visibility: 'shared',
        revision: bucket.revision + 1,
        updatedAt: nowIso(),
      };
      tx.set(bucketRef(this.firestore, bucketId), next);
      tx.set(memberRef(this.firestore, bucketId, user.id), ownerMemberDoc(user));
      const event = activityEvent(bucketId, user, 'bucket_shared', 'bucket', bucketId, {
        title: next.title,
      });
      tx.set(activityRef(this.firestore, bucketId, event.id), event);
      return next;
    });
    return shared;
  }

  async createInvite(
    user: SessionUser,
    bucketId: string,
    role: Exclude<BucketRole, 'owner'>,
  ): Promise<{ invite: BucketInvite; joinCode: string }> {
    assertAssignableRole(role);
    const bucketSnap = await getDoc(bucketRef(this.firestore, bucketId));
    if (!bucketSnap.exists()) throw new Error('Bucket was not found.');
    const bucket = bucketSnap.data() as Bucket;
    if (bucket.ownerId !== user.id) throw new Error(PERMISSION_ERROR);
    if (bucket.visibility !== 'shared') throw new Error('Enable sharing before inviting members.');
    const token = generateInviteToken();
    const tokenHash = await hashInviteToken(token);
    const createdAt = nowIso();
    const invite: BucketInvite = {
      id: tokenHash,
      bucketId,
      bucketTitle: bucket.title,
      ownerName: bucket.ownerName,
      role,
      status: 'pending',
      createdBy: user.id,
      createdAt,
      expiresAt: inviteExpiryIso(createdAt),
      expiresAtMillis: inviteExpiryMillis(createdAt),
      acceptedBy: null,
      acceptedAt: null,
      revokedAt: null,
    };
    const batch = writeBatch(this.firestore);
    batch.set(inviteRef(this.firestore, bucketId, tokenHash), invite);
    const event = activityEvent(bucketId, user, 'invite_created', 'invite', tokenHash, { role });
    batch.set(activityRef(this.firestore, bucketId, event.id), event);
    await batch.commit();
    return { invite, joinCode: buildJoinCode(bucketId, token) };
  }

  async listInvites(_user: SessionUser, bucketId: string): Promise<BucketInvite[]> {
    // Rules restrict invite listing to the bucket owner.
    const snapshot = await getDocs(collection(this.firestore, 'buckets', bucketId, 'invites'));
    return snapshot.docs
      .map((item) => item.data() as BucketInvite)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async revokeInvite(user: SessionUser, bucketId: string, inviteId: string): Promise<void> {
    const batch = writeBatch(this.firestore);
    batch.set(
      inviteRef(this.firestore, bucketId, inviteId),
      { status: 'revoked', revokedAt: nowIso() },
      { merge: true },
    );
    const event = activityEvent(bucketId, user, 'invite_revoked', 'invite', inviteId, {});
    batch.set(activityRef(this.firestore, bucketId, event.id), event);
    await batch.commit();
  }

  async previewJoinCode(code: string): Promise<BucketInvite> {
    const parsed = parseJoinCode(code);
    if (!parsed) throw new Error('This join code is not valid.');
    const tokenHash = await hashInviteToken(parsed.token);
    const snapshot = await getDoc(inviteRef(this.firestore, parsed.bucketId, tokenHash));
    if (!snapshot.exists()) throw new Error('This join code is not valid.');
    const invite = snapshot.data() as BucketInvite;
    if (!isInviteUsable(invite)) throw new Error('This invite has expired or was already used.');
    return invite;
  }

  async acceptJoinCode(user: SessionUser, code: string): Promise<Bucket> {
    const parsed = parseJoinCode(code);
    if (!parsed) throw new Error('This join code is not valid.');
    const tokenHash = await hashInviteToken(parsed.token);
    // Advisory member-limit check (rules cannot count; bounded fan-out contract).
    const currentMembers = await getDocs(
      collection(this.firestore, 'buckets', parsed.bucketId, 'members'),
    ).catch(() => null);
    const activeCount =
      currentMembers?.docs.filter((item) => (item.data() as BucketMember).status === 'active')
        .length ?? 0;
    if (activeCount >= MAX_BUCKET_MEMBERS) {
      throw new Error(`A bucket supports up to ${MAX_BUCKET_MEMBERS} members.`);
    }
    const invite = await runTransaction(this.firestore, async (tx) => {
      const inviteSnap = await tx.get(inviteRef(this.firestore, parsed.bucketId, tokenHash));
      if (!inviteSnap.exists()) throw new Error('This join code is not valid.');
      const pending = inviteSnap.data() as BucketInvite;
      if (!isInviteUsable(pending)) throw new Error('This invite has expired or was already used.');
      const memberSnap = await tx.get(memberRef(this.firestore, parsed.bucketId, user.id));
      const existing = memberSnap.exists() ? (memberSnap.data() as BucketMember) : null;
      if (existing && existing.status === 'active') {
        throw new Error('You are already a member of this bucket.');
      }
      const at = nowIso();
      const member: BucketMember & { inviteId: string } = {
        userId: user.id,
        displayName: user.displayName,
        email: user.email,
        role: pending.role,
        status: 'active',
        invitedBy: pending.createdBy,
        joinedAt: existing?.joinedAt ?? at,
        updatedAt: at,
        inviteId: tokenHash,
      };
      tx.set(memberRef(this.firestore, parsed.bucketId, user.id), member);
      tx.set(
        inviteRef(this.firestore, parsed.bucketId, tokenHash),
        { status: 'accepted', acceptedBy: user.id, acceptedAt: at },
        { merge: true },
      );
      tx.set(membershipRef(this.firestore, user.id, parsed.bucketId), {
        bucketId: parsed.bucketId,
        role: pending.role,
        bucketTitle: pending.bucketTitle,
        ownerName: pending.ownerName,
        joinedAt: at,
      });
      const event = activityEvent(parsed.bucketId, user, 'member_joined', 'member', user.id, {
        role: pending.role,
      });
      tx.set(activityRef(this.firestore, parsed.bucketId, event.id), event);
      return pending;
    });
    const bucketSnap = await getDoc(bucketRef(this.firestore, invite.bucketId));
    if (!bucketSnap.exists()) throw new Error('Bucket was not found.');
    return bucketSnap.data() as Bucket;
  }

  async changeMemberRole(
    user: SessionUser,
    bucketId: string,
    memberId: string,
    role: Exclude<BucketRole, 'owner'>,
  ): Promise<BucketMember> {
    assertAssignableRole(role);
    const snapshot = await getDoc(memberRef(this.firestore, bucketId, memberId));
    if (!snapshot.exists()) throw new Error('Member was not found.');
    const member = snapshot.data() as BucketMember;
    if (member.role === 'owner') throw new Error('Ownership cannot be assigned through invites or role changes.');
    const saved: BucketMember = { ...member, role, updatedAt: nowIso() };
    const batch = writeBatch(this.firestore);
    batch.set(memberRef(this.firestore, bucketId, memberId), saved, { merge: true });
    const event = activityEvent(bucketId, user, 'member_role_changed', 'member', memberId, {
      role,
      memberName: member.displayName,
    });
    batch.set(activityRef(this.firestore, bucketId, event.id), event);
    await batch.commit();
    return saved;
  }

  async revokeMember(user: SessionUser, bucketId: string, memberId: string): Promise<void> {
    const snapshot = await getDoc(memberRef(this.firestore, bucketId, memberId));
    if (!snapshot.exists()) return;
    const member = snapshot.data() as BucketMember;
    if (member.role === 'owner') throw new Error('The owner cannot be removed. Delete the bucket instead.');
    const batch = writeBatch(this.firestore);
    // Contributions are retained in totals; revoked members lose access through rules.
    batch.set(
      memberRef(this.firestore, bucketId, memberId),
      { status: 'revoked', updatedAt: nowIso() },
      { merge: true },
    );
    const event = activityEvent(bucketId, user, 'member_revoked', 'member', memberId, {
      memberName: member.displayName,
    });
    batch.set(activityRef(this.firestore, bucketId, event.id), event);
    await batch.commit();
  }

  async leaveBucket(user: SessionUser, bucketId: string): Promise<void> {
    const snapshot = await getDoc(memberRef(this.firestore, bucketId, user.id));
    if (!snapshot.exists()) return;
    const member = snapshot.data() as BucketMember;
    if (member.role === 'owner') throw new Error('The owner cannot leave. Delete the bucket instead.');
    const batch = writeBatch(this.firestore);
    batch.set(
      memberRef(this.firestore, bucketId, user.id),
      { status: 'left', updatedAt: nowIso() },
      { merge: true },
    );
    batch.delete(membershipRef(this.firestore, user.id, bucketId));
    const event = activityEvent(bucketId, user, 'member_left', 'member', user.id, {});
    batch.set(activityRef(this.firestore, bucketId, event.id), event);
    await batch.commit();
  }

  async setContribution(
    user: SessionUser,
    bucketId: string,
    itemId: string,
    operation: ContributionOperation,
    value: number,
    mutationId: string,
  ): Promise<ContributionMutationRecord> {
    return runTransaction(this.firestore, async (tx) => {
      const mutationSnap = await tx.get(mutationRef(this.firestore, bucketId, mutationId));
      if (mutationSnap.exists()) return mutationSnap.data() as ContributionMutationRecord;
      const bucketSnap = await tx.get(bucketRef(this.firestore, bucketId));
      if (!bucketSnap.exists()) throw new Error('Bucket was not found.');
      const bucket = bucketSnap.data() as Bucket;
      const item = bucket.items.find((candidate) => candidate.id === itemId);
      if (!item?.active) throw new Error('This item is not available.');
      if (bucket.ownerId !== user.id) {
        const memberSnap = await tx.get(memberRef(this.firestore, bucketId, user.id));
        const member = memberSnap.exists() ? (memberSnap.data() as BucketMember) : null;
        if (!memberCan(member, 'contribute')) throw new Error(PERMISSION_ERROR);
      }
      const contributionSnap = await tx.get(contributionRef(this.firestore, bucketId, user.id));
      const result = applyContributionMutation(
        {
          bucketRevision: bucket.revision,
          aggregate: bucket.aggregate,
          contribution: contributionSnap.exists()
            ? (contributionSnap.data() as BucketContribution)
            : null,
          appliedMutation: null,
        },
        {
          mutationId,
          bucketId,
          itemId,
          userId: user.id,
          displayName: user.displayName,
          operation,
          value,
          occurredAt: nowIso(),
        },
      );
      tx.set(contributionRef(this.firestore, bucketId, user.id), result.contribution);
      tx.update(bucketRef(this.firestore, bucketId), {
        aggregate: result.aggregate,
        revision: result.bucketRevision,
        updatedAt: nowIso(),
      });
      tx.set(mutationRef(this.firestore, bucketId, mutationId), result.record);
      const event = activityEvent(bucketId, user, 'contribution_updated', 'item', itemId, {
        itemName: item.name,
        quantity: String(result.record.resultQuantity),
      });
      tx.set(activityRef(this.firestore, bucketId, event.id), event);
      return result.record;
    });
  }

  async listActivity(_user: SessionUser, bucketId: string): Promise<BucketActivityEvent[]> {
    // Rules restrict activity reads to active members.
    const snapshot = await getDocs(
      query(
        collection(this.firestore, 'buckets', bucketId, 'activity'),
        orderBy('createdAt', 'desc'),
        limit(50),
      ),
    );
    return snapshot.docs.map((item) => item.data() as BucketActivityEvent);
  }

  async repairAggregate(
    user: SessionUser,
    bucketId: string,
  ): Promise<{ bucket: Bucket; drifted: boolean }> {
    const contributionsSnap = await getDocs(
      collection(this.firestore, 'buckets', bucketId, 'contributions'),
    );
    const contributionRefs = contributionsSnap.docs.map((item) => item.ref);
    return runTransaction(this.firestore, async (tx) => {
      const bucketSnap = await tx.get(bucketRef(this.firestore, bucketId));
      if (!bucketSnap.exists()) throw new Error('Bucket was not found.');
      const bucket = bucketSnap.data() as Bucket;
      if (bucket.ownerId !== user.id) throw new Error(PERMISSION_ERROR);
      const contributions: BucketContribution[] = [];
      for (const reference of contributionRefs) {
        const snapshot = await tx.get(reference);
        if (snapshot.exists()) contributions.push(snapshot.data() as BucketContribution);
      }
      const { drifted } = detectAggregateDrift(bucket.aggregate, contributions);
      if (!drifted) return { bucket, drifted: false };
      const repaired: Bucket = {
        ...bucket,
        aggregate: computeAggregate(contributions),
        revision: bucket.revision + 1,
        updatedAt: nowIso(),
      };
      tx.set(bucketRef(this.firestore, bucketId), repaired);
      const event = activityEvent(bucketId, user, 'aggregate_repaired', 'bucket', bucketId, {});
      tx.set(activityRef(this.firestore, bucketId, event.id), event);
      return { bucket: repaired, drifted: true };
    });
  }

  async placeGroupOrder(user: SessionUser, bucketId: string, notes: string): Promise<Order> {
    const bucketSnap = await getDoc(bucketRef(this.firestore, bucketId));
    if (!bucketSnap.exists()) throw new Error('Bucket was not found.');
    const bucket = bucketSnap.data() as Bucket;
    if (bucket.ownerId !== user.id) {
      const memberSnap = await getDoc(memberRef(this.firestore, bucketId, user.id));
      const member = memberSnap.exists() ? (memberSnap.data() as BucketMember) : null;
      if (!memberCan(member, 'placeGroupOrder')) throw new Error(PERMISSION_ERROR);
    }
    const lines = buildGroupOrderLines(bucket);
    if (lines.length === 0) throw new Error('Choose at least one item.');
    const contributionsSnap = await getDocs(
      collection(this.firestore, 'buckets', bucketId, 'contributions'),
    );
    const contributions = contributionsSnap.docs.map((item) => item.data() as BucketContribution);
    const order = createOrder(user.id, {
      bucketId,
      bucketTitle: bucket.title,
      currency: bucket.currency,
      lines,
      notes,
      status: 'placed',
      sourceBucketRevision: bucket.revision,
      participants: toOrderParticipants(contributions),
    });
    const batch = writeBatch(this.firestore);
    batch.set(doc(this.firestore, 'users', user.id, 'orders', order.id), order);
    const event = activityEvent(bucketId, user, 'order_placed', 'order', order.id, {
      total: String(order.total),
      currency: order.currency,
    });
    batch.set(activityRef(this.firestore, bucketId, event.id), event);
    await batch.commit();
    return order;
  }
}
