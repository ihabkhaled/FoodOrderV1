import type { PageRequest, PageResult } from '@/shared/helpers';

import type {
  Bucket,
  BucketActivityEvent,
  BucketContribution,
  BucketInvite,
  BucketMember,
  BucketRole,
  ContributionMutationRecord,
  ContributionOperation,
  Order,
  SessionUser,
} from '../types/domain.types';

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
  /** Optional legacy-compatible page hook; the dedicated pagination gateway owns new screens. */
  listSharedWithMePage?(
    user: SessionUser,
    request: PageRequest,
  ): Promise<PageResult<Bucket>>;
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
