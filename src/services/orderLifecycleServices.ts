import { getFunctions, httpsCallable } from 'firebase/functions';

import { buildRepeatedOrderDraft, createOrder, transitionOrder } from '@/lib/order';
import { getFirebaseRuntime } from '@/services/firebaseServices';
import type { Bucket, BucketMember, Order, OrderStatus, SessionUser } from '@/types/domain';

const DATABASE_KEY = 'foodorder:v1:database';
const REGION = 'europe-west1';
const PERMISSION_ERROR = 'You do not have permission for this action.';

interface LocalOrderDatabase {
  buckets: Record<string, Bucket[]>;
  orders: Record<string, Order[]>;
  sharing: {
    members: Record<string, BucketMember[]>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface OrderLifecycleService {
  repeatGroupOrder(user: SessionUser, orderId: string): Promise<Order>;
  transitionGroupOrder(
    user: SessionUser,
    orderId: string,
    status: OrderStatus,
  ): Promise<Order>;
}

const readDatabase = (): LocalOrderDatabase => {
  const raw = localStorage.getItem(DATABASE_KEY);
  if (!raw) throw new Error('The local database is not initialized.');
  return JSON.parse(raw) as LocalOrderDatabase;
};

const writeDatabase = (database: LocalOrderDatabase): void => {
  localStorage.setItem(DATABASE_KEY, JSON.stringify(database));
};

const findBucket = (database: LocalOrderDatabase, bucketId: string): Bucket => {
  const bucket = Object.values(database.buckets)
    .flat()
    .find((candidate) => candidate.id === bucketId);
  if (!bucket) throw new Error('Bucket was not found.');
  return bucket;
};

const assertGroupOrderManager = (
  database: LocalOrderDatabase,
  bucket: Bucket,
  userId: string,
): void => {
  if (bucket.ownerId === userId) return;
  const member = database.sharing.members[bucket.id]?.find(
    (candidate) => candidate.userId === userId,
  );
  if (member?.status !== 'active' || member.role !== 'editor') {
    throw new Error(PERMISSION_ERROR);
  }
};

const actorOrder = (
  database: LocalOrderDatabase,
  userId: string,
  orderId: string,
): Order => {
  const order = database.orders[userId]?.find((candidate) => candidate.id === orderId);
  if (!order) throw new Error('Order was not found.');
  if (!order.groupReceipt) throw new Error('This action requires a group order.');
  return order;
};

export class LocalOrderLifecycleService implements OrderLifecycleService {
  repeatGroupOrder(user: SessionUser, orderId: string): Promise<Order> {
    const database = readDatabase();
    const source = actorOrder(database, user.id, orderId);
    assertGroupOrderManager(database, findBucket(database, source.bucketId), user.id);
    const repeated = {
      ...createOrder(user.id, buildRepeatedOrderDraft(source)),
      subtotal: source.subtotal,
      total: source.total,
    };
    database.orders[user.id] = [repeated, ...(database.orders[user.id] ?? [])];
    writeDatabase(database);
    return Promise.resolve(structuredClone(repeated));
  }

  transitionGroupOrder(
    user: SessionUser,
    orderId: string,
    status: OrderStatus,
  ): Promise<Order> {
    const database = readDatabase();
    const source = actorOrder(database, user.id, orderId);
    assertGroupOrderManager(database, findBucket(database, source.bucketId), user.id);

    let savedActorOrder: Order | null = null;
    for (const [userId, orders] of Object.entries(database.orders)) {
      const index = orders.findIndex((candidate) => candidate.id === orderId);
      const existing = orders[index];
      if (index === -1 || !existing) continue;
      const saved = transitionOrder(existing, status);
      orders[index] = saved;
      if (userId === user.id) savedActorOrder = saved;
    }
    if (!savedActorOrder) throw new Error('Order was not found.');
    writeDatabase(database);
    return Promise.resolve(structuredClone(savedActorOrder));
  }
}

const callable = <Request, Response>(name: string) =>
  httpsCallable<Request, Response>(
    getFunctions(getFirebaseRuntime().app, REGION),
    name,
  );

export class FirestoreCallableOrderLifecycleService
  implements OrderLifecycleService
{
  async repeatGroupOrder(
    _user: SessionUser,
    orderId: string,
  ): Promise<Order> {
    const result = await callable<{ orderId: string }, Order>(
      'repeatGroupOrderV133',
    )({ orderId });
    return result.data;
  }

  async transitionGroupOrder(
    _user: SessionUser,
    orderId: string,
    status: OrderStatus,
  ): Promise<Order> {
    const result = await callable<
      { orderId: string; status: OrderStatus },
      Order
    >('transitionGroupOrderV133')({ orderId, status });
    return result.data;
  }
}
