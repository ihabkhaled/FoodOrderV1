import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { env } from '@/config/env';
import { createBucket, updateBucket } from '@/lib/bucket';
import { nowIso } from '@/lib/date';
import { createOrder, transitionOrder } from '@/lib/order';
import type { AuthService, DataService } from '@/services/contracts';
import type {
  Bucket,
  BucketDraft,
  DashboardSummary,
  Order,
  OrderDraft,
  OrderStatus,
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

export class FirebaseAuthService implements AuthService {
  subscribe(listener: (user: SessionUser | null) => void): () => void {
    return onAuthStateChanged(getFirebaseRuntime().auth, (user) => listener(user ? sessionUser(user) : null));
  }

  async login(email: string, password: string): Promise<SessionUser> {
    const result = await signInWithEmailAndPassword(getFirebaseRuntime().auth, email, password);
    return sessionUser(result.user);
  }

  async register(fullName: string, email: string, password: string): Promise<SessionUser> {
    const { auth, firestore } = getFirebaseRuntime();
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: fullName.trim() });
    const createdAt = nowIso();
    const profile: UserProfile = {
      id: result.user.uid,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      locale: env.defaultLocale,
      theme: 'system',
      defaultCurrency: env.defaultCurrency as UserProfile['defaultCurrency'],
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
}

const userCollection = (firestore: Firestore, userId: string, name: 'buckets' | 'orders') =>
  collection(firestore, 'users', userId, name);

export class FirestoreDataService implements DataService {
  private get firestore(): Firestore {
    return getFirebaseRuntime().firestore;
  }

  async getProfile(user: SessionUser): Promise<UserProfile> {
    const reference = doc(this.firestore, 'users', user.id);
    const snapshot = await getDoc(reference);
    if (snapshot.exists()) return snapshot.data() as UserProfile;
    const createdAt = nowIso();
    const profile: UserProfile = {
      id: user.id,
      fullName: user.displayName,
      email: user.email,
      locale: env.defaultLocale,
      theme: 'system',
      defaultCurrency: env.defaultCurrency as UserProfile['defaultCurrency'],
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

  async listBuckets(userId: string): Promise<Bucket[]> {
    const snapshot = await getDocs(userCollection(this.firestore, userId, 'buckets'));
    return snapshot.docs.map((item) => item.data() as Bucket).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getBucket(userId: string, bucketId: string): Promise<Bucket | null> {
    const snapshot = await getDoc(doc(this.firestore, 'users', userId, 'buckets', bucketId));
    return snapshot.exists() ? (snapshot.data() as Bucket) : null;
  }

  async createBucket(userId: string, draft: BucketDraft): Promise<Bucket> {
    const bucket = createBucket(userId, draft);
    await setDoc(doc(this.firestore, 'users', userId, 'buckets', bucket.id), bucket);
    return bucket;
  }

  async updateBucket(userId: string, bucketId: string, draft: BucketDraft): Promise<Bucket> {
    const existing = await this.getBucket(userId, bucketId);
    if (!existing) throw new Error('Bucket was not found.');
    const saved = updateBucket(existing, draft);
    await setDoc(doc(this.firestore, 'users', userId, 'buckets', bucketId), saved);
    return saved;
  }

  async deleteBucket(userId: string, bucketId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'users', userId, 'buckets', bucketId));
  }

  async listOrders(userId: string): Promise<Order[]> {
    const snapshot = await getDocs(userCollection(this.firestore, userId, 'orders'));
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

  async getDashboard(userId: string): Promise<DashboardSummary> {
    const [buckets, orders] = await Promise.all([this.listBuckets(userId), this.listOrders(userId)]);
    return {
      bucketCount: buckets.length,
      activeItemCount: buckets.reduce((count, bucket) => count + bucket.items.filter((item) => item.active).length, 0),
      orderCount: orders.length,
      placedOrderCount: orders.filter((order) => order.status === 'placed').length,
      completedOrderCount: orders.filter((order) => order.status === 'completed').length,
      recentOrders: orders.slice(0, 5),
    };
  }
}
