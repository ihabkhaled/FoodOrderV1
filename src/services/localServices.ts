import { createBucket, updateBucket } from '@/lib/bucket';
import { nowIso } from '@/lib/date';
import { createId } from '@/lib/id';
import { createOrder, transitionOrder } from '@/lib/order';
import type { AuthService, DataService } from '@/services/contracts';
import type {
  Bucket,
  BucketDraft,
  CurrencyCode,
  DashboardSummary,
  Locale,
  Order,
  OrderDraft,
  OrderStatus,
  SessionUser,
  Theme,
  UserProfile,
} from '@/types/domain';

interface LocalDatabase {
  users: Record<string, { password: string; profile: UserProfile }>;
  buckets: Record<string, Bucket[]>;
  orders: Record<string, Order[]>;
}

const DB_KEY = 'foodorder:v1:database';
const SESSION_KEY = 'foodorder:v1:session';
const AUTH_EVENT = 'foodorder:auth-change';

const defaultDatabase = (): LocalDatabase => ({ users: {}, buckets: {}, orders: {} });

const readDatabase = (): LocalDatabase => {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY) ?? '') as LocalDatabase;
  } catch {
    return defaultDatabase();
  }
};

const writeDatabase = (database: LocalDatabase): void => {
  localStorage.setItem(DB_KEY, JSON.stringify(database));
};

const toSessionUser = (profile: UserProfile): SessionUser => ({
  id: profile.id,
  email: profile.email,
  displayName: profile.fullName,
  isDemo: true,
});

const notifyAuth = (): void => {
  window.dispatchEvent(new Event(AUTH_EVENT));
};

export class LocalAuthService implements AuthService {
  subscribe(listener: (user: SessionUser | null) => void): () => void {
    const emit = (): void => {
      const id = localStorage.getItem(SESSION_KEY);
      const user = id ? readDatabase().users[id] : undefined;
      listener(user ? toSessionUser(user.profile) : null);
    };
    emit();
    window.addEventListener(AUTH_EVENT, emit);
    return () => window.removeEventListener(AUTH_EVENT, emit);
  }

  async login(email: string, password: string): Promise<SessionUser> {
    const database = readDatabase();
    const record = Object.values(database.users).find(
      (item) => item.profile.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!record || record.password !== password) throw new Error('Invalid email or password.');
    localStorage.setItem(SESSION_KEY, record.profile.id);
    notifyAuth();
    return toSessionUser(record.profile);
  }

  async register(fullName: string, email: string, password: string): Promise<SessionUser> {
    const database = readDatabase();
    if (Object.values(database.users).some((item) => item.profile.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account already exists for this email.');
    }
    const id = createId('user');
    const createdAt = nowIso();
    const profile: UserProfile = {
      id,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      locale: 'en' as Locale,
      theme: 'system' as Theme,
      defaultCurrency: 'EGP' as CurrencyCode,
      createdAt,
      updatedAt: createdAt,
    };
    database.users[id] = { password, profile };
    database.buckets[id] = [];
    database.orders[id] = [];
    writeDatabase(database);
    localStorage.setItem(SESSION_KEY, id);
    notifyAuth();
    return toSessionUser(profile);
  }

  async resetPassword(email: string): Promise<void> {
    const exists = Object.values(readDatabase().users).some(
      (item) => item.profile.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!exists) throw new Error('No local account exists for this email.');
    throw new Error('Password reset email requires Firebase mode. In local mode, create another account.');
  }

  async logout(): Promise<void> {
    localStorage.removeItem(SESSION_KEY);
    notifyAuth();
  }
}

export class LocalDataService implements DataService {
  async getProfile(user: SessionUser): Promise<UserProfile> {
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

  async listBuckets(userId: string): Promise<Bucket[]> {
    return structuredClone(readDatabase().buckets[userId] ?? []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getBucket(userId: string, bucketId: string): Promise<Bucket | null> {
    const found = (readDatabase().buckets[userId] ?? []).find((bucket) => bucket.id === bucketId);
    return found ? structuredClone(found) : null;
  }

  async createBucket(userId: string, draft: BucketDraft): Promise<Bucket> {
    const database = readDatabase();
    const bucket = createBucket(userId, draft);
    database.buckets[userId] = [bucket, ...(database.buckets[userId] ?? [])];
    writeDatabase(database);
    return structuredClone(bucket);
  }

  async updateBucket(userId: string, bucketId: string, draft: BucketDraft): Promise<Bucket> {
    const database = readDatabase();
    const buckets = database.buckets[userId] ?? [];
    const index = buckets.findIndex((bucket) => bucket.id === bucketId);
    if (index < 0) throw new Error('Bucket was not found.');
    const existing = buckets[index];
    if (!existing) throw new Error('Bucket was not found.');
    const saved = updateBucket(existing, draft);
    buckets[index] = saved;
    database.buckets[userId] = buckets;
    writeDatabase(database);
    return structuredClone(saved);
  }

  async deleteBucket(userId: string, bucketId: string): Promise<void> {
    const database = readDatabase();
    database.buckets[userId] = (database.buckets[userId] ?? []).filter((bucket) => bucket.id !== bucketId);
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
    if (index < 0 || !existing) throw new Error('Order was not found.');
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

  async getDashboard(userId: string): Promise<DashboardSummary> {
    const buckets = await this.listBuckets(userId);
    const orders = await this.listOrders(userId);
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
