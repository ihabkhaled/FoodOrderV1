import { getFunctions, httpsCallable } from 'firebase/functions';

import { getFirebaseRuntime } from '@/services/firebaseServices';
import type {
  BucketAccessGrant,
  FriendGroup,
  FriendRequest,
  SocialManagementService,
  SocialOverview,
  SocialUser,
} from '@/types/social';

const REGION = 'europe-west1';

const callable = <Request, Response>(name: string) =>
  httpsCallable<Request, Response>(
    getFunctions(getFirebaseRuntime().app, REGION),
    name,
  );

export class FirestoreCallableSocialService
  implements SocialManagementService
{
  async searchUserByEmail(email: string): Promise<SocialUser | null> {
    const result = await callable<{ email: string }, SocialUser | null>(
      'searchSocialUserByEmail',
    )({ email });
    return result.data;
  }

  async getOverview(): Promise<SocialOverview> {
    const result = await callable<Record<string, never>, SocialOverview>(
      'getSocialOverview',
    )({});
    return result.data;
  }

  async sendFriendRequest(email: string): Promise<FriendRequest> {
    const result = await callable<{ email: string }, FriendRequest>(
      'sendFriendRequest',
    )({ email });
    return result.data;
  }

  async respondFriendRequest(
    senderId: string,
    response: 'accepted' | 'declined',
  ): Promise<void> {
    await callable<{ senderId: string; response: string }, { success: true }>(
      'respondFriendRequest',
    )({ senderId, response });
  }

  async unfriend(friendId: string): Promise<void> {
    await callable<{ friendId: string }, { success: true }>('unfriendV150')({
      friendId,
    });
  }

  async createGroup(name: string, description: string): Promise<FriendGroup> {
    const result = await callable<
      { name: string; description: string },
      FriendGroup
    >('createFriendGroup')({ name, description });
    return result.data;
  }

  async inviteFriendToGroup(groupId: string, friendId: string): Promise<void> {
    await callable<
      { groupId: string; friendId: string },
      { success: true }
    >('inviteFriendToGroupV150')({ groupId, friendId });
  }

  async respondGroupInvitation(
    groupId: string,
    response: 'active' | 'declined',
  ): Promise<void> {
    await callable<
      { groupId: string; response: string },
      { success: true }
    >('respondFriendGroupInvitation')({ groupId, response });
  }

  async updateGroup(
    groupId: string,
    name: string,
    description: string,
  ): Promise<FriendGroup> {
    const result = await callable<
      { groupId: string; name: string; description: string },
      FriendGroup
    >('updateFriendGroupV150')({ groupId, name, description });
    return result.data;
  }

  async deleteGroup(groupId: string): Promise<void> {
    await callable<{ groupId: string }, { success: true }>(
      'deleteFriendGroupV150',
    )({ groupId });
  }

  async removeGroupMember(groupId: string, memberId: string): Promise<void> {
    await callable<
      { groupId: string; memberId: string },
      { success: true }
    >('removeFriendGroupMemberV150')({ groupId, memberId });
  }

  async leaveGroup(groupId: string): Promise<void> {
    await callable<{ groupId: string }, { success: true }>(
      'leaveFriendGroupV150',
    )({ groupId });
  }

  async shareBucketWithGroup(
    bucketId: string,
    groupId: string,
    role: 'editor' | 'contributor' | 'viewer',
  ): Promise<BucketAccessGrant> {
    const result = await callable<
      { bucketId: string; groupId: string; role: string },
      BucketAccessGrant
    >('shareBucketWithFriendGroup')({ bucketId, groupId, role });
    return result.data;
  }

  async shareBucketWithUser(
    bucketId: string,
    userId: string,
    role: 'editor' | 'contributor' | 'viewer',
  ): Promise<BucketAccessGrant> {
    const result = await callable<
      { bucketId: string; userId: string; role: string },
      BucketAccessGrant
    >('shareBucketWithFriend')({ bucketId, userId, role });
    return result.data;
  }

  async listBucketAccessGrants(bucketId: string): Promise<BucketAccessGrant[]> {
    const result = await callable<
      { bucketId: string },
      BucketAccessGrant[]
    >('listBucketAccessGrants')({ bucketId });
    return result.data;
  }
}

export { LocalSocialManagementService as LocalSocialService } from '@/services/localSocialManagementService';
