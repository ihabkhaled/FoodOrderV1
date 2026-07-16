import type { BucketRole } from '@/types/domain';

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

export interface SocialService {
  searchUserByEmail(email: string): Promise<SocialUser | null>;
  getOverview(): Promise<SocialOverview>;
  sendFriendRequest(email: string): Promise<FriendRequest>;
  respondFriendRequest(
    senderId: string,
    response: 'accepted' | 'declined',
  ): Promise<void>;
  createGroup(name: string, description: string): Promise<FriendGroup>;
  inviteFriendToGroup(groupId: string, friendId: string): Promise<void>;
  respondGroupInvitation(
    groupId: string,
    response: 'active' | 'declined',
  ): Promise<void>;
  inviteFriendToBucket(
    bucketId: string,
    friendId: string,
    role: BucketShareRole,
  ): Promise<BucketInvitation>;
  respondBucketInvitation(
    bucketId: string,
    response: 'accepted' | 'declined',
  ): Promise<void>;
  shareBucketWithGroup(
    bucketId: string,
    groupId: string,
    role: Exclude<BucketRole, 'owner'>,
  ): Promise<BucketAccessGrant>;
  shareBucketWithUser(
    bucketId: string,
    userId: string,
    role: Exclude<BucketRole, 'owner'>,
  ): Promise<BucketAccessGrant>;
  listBucketAccessGrants(bucketId: string): Promise<BucketAccessGrant[]>;
}

export interface SocialManagementService extends SocialService {
  unfriend(friendId: string): Promise<void>;
  updateGroup(
    groupId: string,
    name: string,
    description: string,
  ): Promise<FriendGroup>;
  deleteGroup(groupId: string): Promise<void>;
  removeGroupMember(groupId: string, memberId: string): Promise<void>;
  leaveGroup(groupId: string): Promise<void>;
}
