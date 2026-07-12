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

export interface AuthService {
  subscribe(listener: (user: SessionUser | null) => void): () => void;
  login(email: string, password: string): Promise<SessionUser>;
  register(fullName: string, email: string, password: string): Promise<SessionUser>;
  resetPassword(email: string): Promise<void>;
  logout(): Promise<void>;
}

export interface DataService {
  getProfile(user: SessionUser): Promise<UserProfile>;
  saveProfile(profile: UserProfile): Promise<UserProfile>;
  listBuckets(userId: string): Promise<Bucket[]>;
  getBucket(userId: string, bucketId: string): Promise<Bucket | null>;
  createBucket(userId: string, draft: BucketDraft): Promise<Bucket>;
  updateBucket(userId: string, bucketId: string, draft: BucketDraft): Promise<Bucket>;
  deleteBucket(userId: string, bucketId: string): Promise<void>;
  listOrders(userId: string): Promise<Order[]>;
  getOrder(userId: string, orderId: string): Promise<Order | null>;
  createOrder(userId: string, draft: OrderDraft): Promise<Order>;
  updateOrderStatus(userId: string, orderId: string, status: OrderStatus): Promise<Order>;
  deleteOrder(userId: string, orderId: string): Promise<void>;
  getDashboard(userId: string): Promise<DashboardSummary>;
}
