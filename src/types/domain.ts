export type Locale = 'en' | 'ar';
export type Theme = 'system' | 'light' | 'dark';
export type CurrencyCode = 'EGP' | 'USD' | 'EUR' | 'GBP' | 'SAR' | 'AED';
export type OrderStatus = 'draft' | 'placed' | 'completed' | 'cancelled';
export type BucketVisibility = 'private' | 'shared';
export type BucketRole = 'owner' | 'editor' | 'contributor' | 'viewer';
export type MemberStatus = 'active' | 'revoked' | 'left';
export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
export type ContributionOperation = 'set' | 'increment';
export type BucketActivityType =
  | 'bucket_shared'
  | 'bucket_updated'
  | 'invite_created'
  | 'invite_revoked'
  | 'member_joined'
  | 'member_left'
  | 'member_revoked'
  | 'member_role_changed'
  | 'contribution_updated'
  | 'order_placed'
  | 'aggregate_repaired';

export interface SessionUser { id: string; email: string; displayName: string; isDemo: boolean; }
export interface ProfileDefaults { locale: Locale; theme: Theme; defaultCurrency: CurrencyCode; }
export interface UserProfile { id: string; fullName: string; email: string; locale: Locale; theme: Theme; defaultCurrency: CurrencyCode; createdAt: string; updatedAt: string; }
export interface BucketItem { id: string; name: string; description: string; category: string; unitPrice: number; active: boolean; sortOrder: number; }
export interface Bucket {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  currency: CurrencyCode;
  visibility: BucketVisibility;
  status: 'active';
  schemaVersion: number;
  revision: number;
  items: BucketItem[];
  /** Materialized itemId -> total quantity across all member contributions. */
  aggregate: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}
export interface BucketMember { userId: string; displayName: string; email: string; role: BucketRole; status: MemberStatus; invitedBy: string; joinedAt: string; updatedAt: string; }
export interface BucketMembershipRef { bucketId: string; role: BucketRole; bucketTitle: string; ownerName: string; joinedAt: string; }
export interface BucketInvite {
  id: string;
  bucketId: string;
  bucketTitle: string;
  ownerName: string;
  role: Exclude<BucketRole, 'owner'>;
  status: InviteStatus;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  /** Numeric mirror of expiresAt so Security Rules can compare against request.time. */
  expiresAtMillis: number;
  acceptedBy: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
}
export interface BucketContribution {
  bucketId: string;
  userId: string;
  displayName: string;
  /** itemId -> this member's quantity. Only this member may write it. */
  quantities: Record<string, number>;
  revision: number;
  lastMutationId: string;
  updatedAt: string;
}
export interface ContributionMutationRecord {
  id: string;
  bucketId: string;
  itemId: string;
  userId: string;
  operation: ContributionOperation;
  requestedValue: number;
  appliedDelta: number;
  resultQuantity: number;
  resultRevision: number;
  createdAt: string;
}
export interface BucketActivityEvent {
  id: string;
  bucketId: string;
  type: BucketActivityType;
  actorId: string;
  actorName: string;
  targetType: 'bucket' | 'member' | 'invite' | 'item' | 'order';
  targetId: string;
  /** Locale-independent safe details (names, counts); never tokens or emails of others. */
  metadata: Record<string, string>;
  createdAt: string;
}
export interface SharedOrderParticipant { userId: string; displayName: string; quantities: Record<string, number>; }
export interface OrderLine { id: string; bucketItemId: string; name: string; quantity: number; unitPrice: number; lineTotal: number; }
export interface Order {
  id: string;
  userId: string;
  bucketId: string;
  bucketTitle: string;
  status: OrderStatus;
  currency: CurrencyCode;
  lines: OrderLine[];
  notes: string;
  subtotal: number;
  total: number;
  /** Bucket revision captured when a group order snapshots a shared bucket. */
  sourceBucketRevision: number | null;
  /** Per-member quantity snapshot for group orders; null for personal orders. */
  participants: SharedOrderParticipant[] | null;
  createdAt: string;
  updatedAt: string;
  placedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}
export interface BucketDraft { title: string; description: string; currency: CurrencyCode; items: (Omit<BucketItem, 'sortOrder'> & { sortOrder?: number })[]; }
export interface OrderDraft {
  bucketId: string;
  bucketTitle: string;
  currency: CurrencyCode;
  lines: Omit<OrderLine, 'lineTotal'>[];
  notes: string;
  status?: OrderStatus;
  sourceBucketRevision?: number | null;
  participants?: SharedOrderParticipant[] | null;
}
export interface DashboardSummary { bucketCount: number; sharedBucketCount: number; activeItemCount: number; orderCount: number; placedOrderCount: number; completedOrderCount: number; recentOrders: Order[]; }
