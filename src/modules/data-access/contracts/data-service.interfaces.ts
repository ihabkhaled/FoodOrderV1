import type { PageRequest, PageResult } from '@/shared/helpers';

import type {
  Bucket,
  BucketDraft,
  BucketRole,
  DashboardSummary,
  Order,
  OrderDraft,
  OrderStatus,
  ProfileDefaults,
  SessionUser,
  UserProfile,
} from '../types/domain.types';

/** Portable snapshot of everything a user owns (FEAT-059 privacy export). */
export interface UserDataExport {
  exportedAt: string;
  profile: UserProfile;
  buckets: Bucket[];
  orders: Order[];
  memberships: { bucketId: string; bucketTitle: string; role: BucketRole }[];
}

export interface DataService {
  getProfile(user: SessionUser, defaults: ProfileDefaults): Promise<UserProfile>;
  saveProfile(profile: UserProfile): Promise<UserProfile>;
  listBuckets(user: SessionUser): Promise<Bucket[]>;
  /** Optional legacy-compatible page hook; the dedicated pagination gateway owns new screens. */
  listBucketsPage?(
    user: SessionUser,
    request: PageRequest,
  ): Promise<PageResult<Bucket>>;
  getBucket(user: SessionUser, bucketId: string): Promise<Bucket | null>;
  createBucket(user: SessionUser, draft: BucketDraft): Promise<Bucket>;
  updateBucket(user: SessionUser, bucketId: string, draft: BucketDraft): Promise<Bucket>;
  deleteBucket(user: SessionUser, bucketId: string): Promise<void>;
  listOrders(userId: string): Promise<Order[]>;
  /** Optional legacy-compatible page hook; the dedicated pagination gateway owns new screens. */
  listOrdersPage?(
    userId: string,
    request: PageRequest,
  ): Promise<PageResult<Order>>;
  getOrder(userId: string, orderId: string): Promise<Order | null>;
  createOrder(userId: string, draft: OrderDraft): Promise<Order>;
  updateOrderStatus(userId: string, orderId: string, status: OrderStatus): Promise<Order>;
  deleteOrder(userId: string, orderId: string): Promise<void>;
  getDashboard(user: SessionUser): Promise<DashboardSummary>;
  exportUserData(user: SessionUser, defaults: ProfileDefaults): Promise<UserDataExport>;
  /**
   * Cascade removal of user-owned data: owned buckets (with subcollections),
   * orders, membership mirrors, and finally the profile. Memberships in other
   * people's buckets are marked left. Auth deletion happens separately.
   */
  deleteAllUserData(user: SessionUser): Promise<void>;
}
