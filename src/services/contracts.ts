import type {
  Bucket,
  BucketActivityEvent,
  BucketContribution,
  BucketDraft,
  BucketInvite,
  BucketMember,
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

export interface AuthService {
  subscribe(listener: (user: SessionUser | null) => void): () => void;
  login(email: string, password: string): Promise<SessionUser>;
  register(
    fullName: string,
    email: string,
    password: string,
    defaults: ProfileDefaults,
  ): Promise<SessionUser>;
  resetPassword(email: string): Promise<void>;
  logout(): Promise<void>;
  /** Deletes the authentication account itself; data cascade runs first via DataService. */
  deleteAccount(user: SessionUser): Promise<void>;
}

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
  getBucket(user: SessionUser, bucketId: string): Promise<Bucket | null>;
  createBucket(user: SessionUser, draft: BucketDraft): Promise<Bucket>;
  updateBucket(user: SessionUser, bucketId: string, draft: BucketDraft): Promise<Bucket>;
  deleteBucket(user: SessionUser, bucketId: string): Promise<void>;
  listOrders(userId: string): Promise<Order[]>;
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

/** Everything returned for one shared-bucket screen in a single call. */
export interface SharedBucketView {
  bucket: Bucket;
  members: BucketMember[];
  contributions: BucketContribution[];
  myRole: BucketRole;
}

export interface SharingService {
  /** Buckets shared with the user by someone else (active membership, not owner). */
  listSharedWithMe(user: SessionUser): Promise<Bucket[]>;
  getSharedBucketView(user: SessionUser, bucketId: string): Promise<SharedBucketView | null>;
  enableSharing(user: SessionUser, bucketId: string): Promise<Bucket>;
  createInvite(
    user: SessionUser,
    bucketId: string,
    role: Exclude<BucketRole, 'owner'>,
  ): Promise<{ invite: BucketInvite; joinCode: string }>;
  listInvites(user: SessionUser, bucketId: string): Promise<BucketInvite[]>;
  revokeInvite(user: SessionUser, bucketId: string, inviteId: string): Promise<void>;
  /** Reads only invite metadata; never requires membership. */
  previewJoinCode(code: string): Promise<BucketInvite>;
  acceptJoinCode(user: SessionUser, code: string): Promise<Bucket>;
  changeMemberRole(
    user: SessionUser,
    bucketId: string,
    memberId: string,
    role: Exclude<BucketRole, 'owner'>,
  ): Promise<BucketMember>;
  revokeMember(user: SessionUser, bucketId: string, memberId: string): Promise<void>;
  leaveBucket(user: SessionUser, bucketId: string): Promise<void>;
  /**
   * Idempotent contribution write: retrying with the same mutationId returns
   * the recorded result without double-applying the quantity change.
   */
  setContribution(
    user: SessionUser,
    bucketId: string,
    itemId: string,
    operation: ContributionOperation,
    value: number,
    mutationId: string,
  ): Promise<ContributionMutationRecord>;
  listActivity(user: SessionUser, bucketId: string): Promise<BucketActivityEvent[]>;
  /** Owner-only: recompute the materialized aggregate from contributions. */
  repairAggregate(user: SessionUser, bucketId: string): Promise<{ bucket: Bucket; drifted: boolean }>;
  placeGroupOrder(user: SessionUser, bucketId: string, notes: string): Promise<Order>;
}
