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
  | 'removed';

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

export interface BucketAccessGrant {
  id: string;
  bucketId: string;
  subjectType: 'user' | 'group';
  subjectId: string;
  subjectName: string;
  role: Exclude<BucketRole, 'owner'>;
  createdAt: string;
}

export interface SocialOverview {
  friends: SocialUser[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  groups: FriendGroup[];
  groupInvitations: GroupInvitation[];
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
