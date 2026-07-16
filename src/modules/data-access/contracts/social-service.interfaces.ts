import type { BucketRole } from '../types/domain.types';
import type {
  BucketAccessGrant,
  FriendGroup,
  FriendRequest,
  SocialOverview,
  SocialUser,
} from '../types/social.types';

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
