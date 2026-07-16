import type { BucketRole } from './domain.types';

export type SocialRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled';
export type GroupMembershipStatus =
  | 'pending'
  | 'active'
  | 'declined'
  | 'removed'
  | 'left';

export interface SocialUser {
  userId: string;
  displayName: string;
  email: string;
}

export interface FriendRequest {
  id: string;
  sender: SocialUser;
  recipient: SocialUser;
  status: SocialRequestStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface FriendGroupMember extends SocialUser {
  status: GroupMembershipStatus;
  invitedBy: string;
  invitedAt: string;
  respondedAt: string | null;
}

export interface FriendGroup {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  members: FriendGroupMember[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupInvitation {
  groupId: string;
  groupName: string;
  owner: SocialUser;
  recipient: SocialUser;
  status: GroupMembershipStatus;
  invitedAt: string;
  respondedAt: string | null;
}

export type BucketInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'declined';
export type BucketShareRole = Exclude<BucketRole, 'owner'>;

export interface BucketInvitation {
  id: string;
  bucketId: string;
  bucketTitle: string;
  owner: SocialUser;
  recipient: SocialUser;
  role: BucketShareRole;
  status: BucketInvitationStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface BucketAccessGrant {
  id: string;
  bucketId: string;
  subjectType: 'user' | 'group';
  subjectId: string;
  subjectName: string;
  role: BucketShareRole;
  grantedBy: string;
  createdAt: string;
  /** Present when the direct grant was materialized by an accepted invitation. */
  invitationId?: string;
}

export interface SocialOverview {
  friends: SocialUser[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  groups: FriendGroup[];
  groupInvitations: GroupInvitation[];
  /** Optional during the v1.5.0 -> v1.5.1 client compatibility window. */
  bucketInvitations?: BucketInvitation[];
}
