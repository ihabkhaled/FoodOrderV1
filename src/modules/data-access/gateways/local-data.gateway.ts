import { nowIso } from '@/shared/helpers';

import type { DataService, UserDataExport } from '../contracts/data-service.interfaces';
import { createBucket, updateBucket } from '../helpers/bucket.helper';
import { createOrder, transitionOrder } from '../helpers/order.helper';
import { isActiveMember, omitKey } from '../helpers/sharing.helper';
import type {
  Bucket,
  BucketDraft,
  DashboardSummary,
  Order,
  OrderDraft,
  OrderStatus,
  ProfileDefaults,
  SessionUser,
  UserProfile,
} from '../types/domain.types';
import {
  appendActivity,
  findBucketEntry,
  memberOf,
  readDatabase,
  roleOf,
  storeBucket,
  writeDatabase,
} from './local-database.helper';

export class LocalDataService implements DataService {
  async getProfile(user: SessionUser, _defaults: ProfileDefaults): Promise<UserProfile> {
    // Local profiles are always seeded at registration; defaults only apply there.
    const record = readDatabase().users[user.id];
    if (!record) throw new Error('User profile was not found.');
    return structuredClone(record.profile);
  }

  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    const database = readDatabase();
    const existing = database.users[profile.id];
    if (!existing) throw new Error('User profile was not found.');
    const saved = { ...profile, updatedAt: nowIso() };
    database.users[profile.id] = { ...existing, profile: saved };
    writeDatabase(database);
    return structuredClone(saved);
  }

  async listBuckets(user: SessionUser): Promise<Bucket[]> {
    return structuredClone(readDatabase().buckets[user.id] ?? []).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  async getBucket(user: SessionUser, bucketId: string): Promise<Bucket | null> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) return null;
    return roleOf(database, entry.bucket, user.id) ? structuredClone(entry.bucket) : null;
  }

  async createBucket(user: SessionUser, draft: BucketDraft): Promise<Bucket> {
    const database = readDatabase();
    const bucket = createBucket({ id: user.id, displayName: user.displayName }, draft);
    database.buckets[user.id] = [bucket, ...(database.buckets[user.id] ?? [])];
    writeDatabase(database);
    return structuredClone(bucket);
  }

  async updateBucket(user: SessionUser, bucketId: string, draft: BucketDraft): Promise<Bucket> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) throw new Error('Bucket was not found.');
    const role = roleOf(database, entry.bucket, user.id);
    if (!role || !['owner', 'editor'].includes(role)) throw new Error('You do not have permission for this action.');
    const saved = updateBucket(entry.bucket, draft);
    storeBucket(database, entry, saved);
    if (saved.visibility === 'shared') {
      appendActivity(database, bucketId, user, 'bucket_updated', 'bucket', bucketId, {
        title: saved.title,
      });
    }
    writeDatabase(database);
    return structuredClone(saved);
  }

  async deleteBucket(user: SessionUser, bucketId: string): Promise<void> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) return;
    if (entry.bucket.ownerId !== user.id) throw new Error('You do not have permission for this action.');
    database.buckets[entry.ownerId] = (database.buckets[entry.ownerId] ?? []).filter(
      (bucket) => bucket.id !== bucketId,
    );
    database.sharing = {
      members: omitKey(database.sharing.members, bucketId),
      invites: omitKey(database.sharing.invites, bucketId),
      contributions: omitKey(database.sharing.contributions, bucketId),
      mutations: omitKey(database.sharing.mutations, bucketId),
      activity: omitKey(database.sharing.activity, bucketId),
    };
    writeDatabase(database);
  }

  async listOrders(userId: string): Promise<Order[]> {
    return structuredClone(readDatabase().orders[userId] ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getOrder(userId: string, orderId: string): Promise<Order | null> {
    const found = (readDatabase().orders[userId] ?? []).find((order) => order.id === orderId);
    return found ? structuredClone(found) : null;
  }

  async createOrder(userId: string, draft: OrderDraft): Promise<Order> {
    const database = readDatabase();
    const order = createOrder(userId, draft);
    database.orders[userId] = [order, ...(database.orders[userId] ?? [])];
    writeDatabase(database);
    return structuredClone(order);
  }

  async updateOrderStatus(userId: string, orderId: string, status: OrderStatus): Promise<Order> {
    const database = readDatabase();
    const orders = database.orders[userId] ?? [];
    const index = orders.findIndex((order) => order.id === orderId);
    const existing = orders[index];
    if (index === -1 || !existing) throw new Error('Order was not found.');
    const saved = transitionOrder(existing, status);
    orders[index] = saved;
    database.orders[userId] = orders;
    writeDatabase(database);
    return structuredClone(saved);
  }

  async deleteOrder(userId: string, orderId: string): Promise<void> {
    const database = readDatabase();
    database.orders[userId] = (database.orders[userId] ?? []).filter((order) => order.id !== orderId);
    writeDatabase(database);
  }

  async getDashboard(user: SessionUser): Promise<DashboardSummary> {
    const database = readDatabase();
    const buckets = database.buckets[user.id] ?? [];
    const orders = database.orders[user.id] ?? [];
    const shared = Object.values(database.buckets)
      .flat()
      .filter(
        (bucket) =>
          bucket.ownerId !== user.id && isActiveMember(memberOf(database, bucket.id, user.id)),
      );
    return {
      bucketCount: buckets.length,
      sharedBucketCount: shared.length,
      activeItemCount: buckets.reduce((count, bucket) => count + bucket.items.filter((item) => item.active).length, 0),
      orderCount: orders.length,
      placedOrderCount: orders.filter((order) => order.status === 'placed').length,
      completedOrderCount: orders.filter((order) => order.status === 'completed').length,
      recentOrders: structuredClone(orders.slice(0, 5)),
    };
  }

  async exportUserData(user: SessionUser, defaults: ProfileDefaults): Promise<UserDataExport> {
    const database = readDatabase();
    const profile = await this.getProfile(user, defaults);
    const memberships = Object.values(database.buckets)
      .flat()
      .filter((bucket) => bucket.ownerId !== user.id)
      .map((bucket) => ({ bucket, member: memberOf(database, bucket.id, user.id) }))
      .filter(({ member }) => isActiveMember(member))
      .map(({ bucket, member }) => ({
        bucketId: bucket.id,
        bucketTitle: bucket.title,
        role: member?.role ?? 'viewer',
      }));
    return structuredClone({
      exportedAt: nowIso(),
      profile,
      buckets: database.buckets[user.id] ?? [],
      orders: database.orders[user.id] ?? [],
      memberships,
    });
  }

  async deleteAllUserData(user: SessionUser): Promise<void> {
    const database = readDatabase();
    for (const bucket of database.buckets[user.id] ?? []) {
      database.sharing = {
        members: omitKey(database.sharing.members, bucket.id),
        invites: omitKey(database.sharing.invites, bucket.id),
        contributions: omitKey(database.sharing.contributions, bucket.id),
        mutations: omitKey(database.sharing.mutations, bucket.id),
        activity: omitKey(database.sharing.activity, bucket.id),
      };
    }
    // Memberships in other people's buckets become 'left'; contributions stay in totals.
    for (const members of Object.values(database.sharing.members)) {
      for (const member of members) {
        if (member.userId === user.id && member.status === 'active') {
          member.status = 'left';
          member.updatedAt = nowIso();
        }
      }
    }
    database.buckets = omitKey(database.buckets, user.id);
    database.orders = omitKey(database.orders, user.id);
    database.users = omitKey(database.users, user.id);
    writeDatabase(database);
  }
}
