import {
  collection,
  deleteDoc,
  doc,
  type Firestore,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from '@/packages/firebase';
import { nowIso } from '@/shared/helpers';

import type { DataService, UserDataExport } from '../contracts/data-service.interfaces';
import { createBucket, updateBucket, upgradeLegacyBucket } from '../helpers/bucket.helper';
import { createOrder, transitionOrder } from '../helpers/order.helper';
import { memberCan } from '../helpers/sharing.helper';
import type {
  Bucket,
  BucketDraft,
  BucketMember,
  BucketMembershipRef,
  DashboardSummary,
  Order,
  OrderDraft,
  OrderStatus,
  ProfileDefaults,
  SessionUser,
  UserProfile,
} from '../types/domain.types';
import {
  activityEvent,
  activityRef,
  bucketRef,
  getFirebaseRuntime,
  memberRef,
  membershipDoc,
  membershipRef,
  ownerMemberDoc,
  PERMISSION_ERROR,
} from './firebase-runtime.gateway';

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
