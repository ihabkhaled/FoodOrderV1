import { LocalSocialService } from '@/services/localSocialService';
import { pushLocalNotification } from '@/services/notificationServices';
import type { BucketMember } from '@/types/domain';
import type {
  BucketAccessGrant,
  BucketInvitation,
  BucketShareRole,
  FriendGroup,
  FriendRequest,
  GroupInvitation,
  SocialManagementService,
  SocialUser,
} from '@/types/social';

const APP_DATABASE_KEY = 'foodorder:v1:database';
const SOCIAL_DATABASE_KEY = 'foodorder:v1:social';
const SESSION_KEY = 'foodorder:v1:session';

interface LocalUserRecord {
  profile: {
    id: string;
    fullName: string;
    email: string;
  };
}

interface LocalAppDatabase {
  users: Record<string, LocalUserRecord>;
  sharing: {
    members: Record<string, BucketMember[]>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface LocalSocialDatabase {
  requests: FriendRequest[];
  friends: Record<string, SocialUser[]>;
  groups: FriendGroup[];
  invitations: GroupInvitation[];
  bucketInvitations: BucketInvitation[];
  grants: BucketAccessGrant[];
}

type MemberWithSources = BucketMember & { accessSources?: string[] };

const readAppDatabase = (): LocalAppDatabase => {
  const raw = localStorage.getItem(APP_DATABASE_KEY);
  if (!raw) throw new Error('The local database is not initialized.');
  return JSON.parse(raw) as LocalAppDatabase;
};

const writeAppDatabase = (database: LocalAppDatabase): void => {
  localStorage.setItem(APP_DATABASE_KEY, JSON.stringify(database));
};

const readSocialDatabase = (): LocalSocialDatabase => {
  const raw = localStorage.getItem(SOCIAL_DATABASE_KEY);
  if (!raw) {
    return {
      requests: [],
      friends: {},
      groups: [],
      invitations: [],
      bucketInvitations: [],
      grants: [],
    };
  }
  const parsed = JSON.parse(raw) as Partial<LocalSocialDatabase>;
  return {
    requests: parsed.requests ?? [],
    friends: parsed.friends ?? {},
    groups: parsed.groups ?? [],
    invitations: parsed.invitations ?? [],
    bucketInvitations: parsed.bucketInvitations ?? [],
    grants: parsed.grants ?? [],
  };
};

const writeSocialDatabase = (database: LocalSocialDatabase): void => {
  localStorage.setItem(SOCIAL_DATABASE_KEY, JSON.stringify(database));
};

const currentUser = (): SocialUser => {
  const userId = localStorage.getItem(SESSION_KEY);
  const record = userId ? readAppDatabase().users[userId] : undefined;
  if (!record) throw new Error('Authentication is required.');
  return {
    userId: record.profile.id,
    displayName: record.profile.fullName,
    email: record.profile.email,
  };
};

const detachGroupAccess = (
  appDatabase: LocalAppDatabase,
  socialDatabase: LocalSocialDatabase,
  groupId: string,
  userId: string,
): void => {
  const grants = socialDatabase.grants.filter(
    (grant) => grant.subjectType === 'group' && grant.subjectId === groupId,
  );
  for (const grant of grants) {
    const members = [...(appDatabase.sharing.members[grant.bucketId] ?? [])];
    const index = members.findIndex((member) => member.userId === userId);
    const member = members[index] as MemberWithSources | undefined;
    if (!member) continue;
    const accessSources = (member.accessSources ?? []).filter(
      (source) => source !== grant.id,
    );
    const rolePriority = { viewer: 1, contributor: 2, editor: 3 } as const;
    const remainingRole = socialDatabase.grants
      .filter((candidate) => accessSources.includes(candidate.id))
      .reduce<BucketAccessGrant['role'] | null>((strongest, candidate) => {
        if (!strongest) return candidate.role;
        return rolePriority[candidate.role] > rolePriority[strongest]
          ? candidate.role
          : strongest;
      }, null);
    members[index] = {
      ...member,
      role: remainingRole ?? member.role,
      status: remainingRole ? 'active' : 'revoked',
      canCreateCustomItems: remainingRole === 'editor',
      canSetCustomItemPrice: remainingRole === 'editor',
      accessSources,
      updatedAt: new Date().toISOString(),
    } as MemberWithSources;
    appDatabase.sharing.members[grant.bucketId] = members;
  }
};

const notificationActor = (actor: SocialUser) => ({
  actorId: actor.userId,
  actorName: actor.displayName,
});

export class LocalSocialManagementService
  extends LocalSocialService
  implements SocialManagementService
{
  override async sendFriendRequest(email: string): Promise<FriendRequest> {
    const request = await super.sendFriendRequest(email);
    pushLocalNotification(request.recipient.userId, {
      kind: 'friend_request',
      title: 'New friend request',
      message: `${request.sender.displayName} sent you a friend request.`,
      route: '/social',
      entityType: 'friend',
      entityId: request.sender.userId,
      ...notificationActor(request.sender),
    });
    return request;
  }

  override async respondFriendRequest(
    senderId: string,
    response: 'accepted' | 'declined',
  ): Promise<void> {
    const recipient = currentUser();
    const request = readSocialDatabase().requests.find(
      (candidate) =>
        candidate.sender.userId === senderId &&
        candidate.recipient.userId === recipient.userId &&
        candidate.status === 'pending',
    );
    await super.respondFriendRequest(senderId, response);
    if (request && response === 'accepted') {
      pushLocalNotification(senderId, {
        kind: 'friend_request_accepted',
        title: 'Friend request accepted',
        message: `${recipient.displayName} accepted your friend request.`,
        route: '/social',
        entityType: 'friend',
        entityId: recipient.userId,
        ...notificationActor(recipient),
      });
    }
  }

  unfriend(friendId: string): Promise<void> {
    const actor = currentUser();
    const database = readSocialDatabase();
    const friend = (database.friends[actor.userId] ?? []).find(
      (candidate) => candidate.userId === friendId,
    );
    if (!friend) throw new Error('Friend was not found.');
    database.friends[actor.userId] = (database.friends[actor.userId] ?? []).filter(
      (candidate) => candidate.userId !== friendId,
    );
    database.friends[friendId] = (database.friends[friendId] ?? []).filter(
      (candidate) => candidate.userId !== actor.userId,
    );
    database.requests = database.requests.filter(
      (request) =>
        ![request.sender.userId, request.recipient.userId].every((userId) =>
          [actor.userId, friendId].includes(userId),
        ),
    );
    writeSocialDatabase(database);
    pushLocalNotification(friendId, {
      kind: 'friend_removed',
      title: 'Friend removed',
      message: `${actor.displayName} removed the friendship.`,
      route: '/social',
      entityType: 'friend',
      entityId: actor.userId,
      ...notificationActor(actor),
    });
    return Promise.resolve();
  }

  override async inviteFriendToGroup(
    groupId: string,
    friendId: string,
  ): Promise<void> {
    const actor = currentUser();
    const database = readSocialDatabase();
    const group = database.groups.find((candidate) => candidate.id === groupId);
    const friend = (database.friends[actor.userId] ?? []).find(
      (candidate) => candidate.userId === friendId,
    );
    await super.inviteFriendToGroup(groupId, friendId);
    if (group && friend) {
      pushLocalNotification(friendId, {
        kind: 'group_invitation',
        title: 'New group invitation',
        message: `${actor.displayName} invited you to ${group.name}.`,
        route: '/social',
        entityType: 'group',
        entityId: groupId,
        ...notificationActor(actor),
      });
    }
  }

  override async respondGroupInvitation(
    groupId: string,
    response: 'active' | 'declined',
  ): Promise<void> {
    const actor = currentUser();
    const invitation = readSocialDatabase().invitations.find(
      (candidate) =>
        candidate.groupId === groupId &&
        candidate.recipient.userId === actor.userId &&
        candidate.status === 'pending',
    );
    await super.respondGroupInvitation(groupId, response);
    if (invitation) {
      pushLocalNotification(invitation.owner.userId, {
        kind:
          response === 'active'
            ? 'group_invitation_accepted'
            : 'group_invitation_declined',
        title:
          response === 'active'
            ? 'Group invitation accepted'
            : 'Group invitation declined',
        message: `${actor.displayName} ${response === 'active' ? 'joined' : 'declined'} ${invitation.groupName}.`,
        route: '/social',
        entityType: 'group',
        entityId: groupId,
        ...notificationActor(actor),
      });
    }
  }

  override async inviteFriendToBucket(
    bucketId: string,
    friendId: string,
    role: BucketShareRole,
  ): Promise<BucketInvitation> {
    const actor = currentUser();
    const existingPending = readSocialDatabase().bucketInvitations.some(
      (candidate) =>
        candidate.bucketId === bucketId &&
        candidate.recipient.userId === friendId &&
        candidate.status === 'pending',
    );
    const invitation = await super.inviteFriendToBucket(
      bucketId,
      friendId,
      role,
    );
    if (!existingPending) {
      pushLocalNotification(friendId, {
        id: `bucket-invitation-${invitation.id}-${invitation.createdAt}`,
        kind: 'bucket_invitation',
        title: 'New bucket invitation',
        message: `${actor.displayName} invited you to ${invitation.bucketTitle}.`,
        route: '/social',
        entityType: 'bucket',
        entityId: bucketId,
        ...notificationActor(actor),
      });
    }
    return invitation;
  }

  override async respondBucketInvitation(
    bucketId: string,
    response: 'accepted' | 'declined',
  ): Promise<void> {
    const actor = currentUser();
    const invitation = readSocialDatabase().bucketInvitations.find(
      (candidate) =>
        candidate.bucketId === bucketId &&
        candidate.recipient.userId === actor.userId &&
        candidate.status === 'pending',
    );
    await super.respondBucketInvitation(bucketId, response);
    const respondedInvitation = readSocialDatabase().bucketInvitations.some(
      (candidate) =>
        candidate.id === invitation?.id && candidate.status === response,
    );
    if (invitation && respondedInvitation) {
      pushLocalNotification(invitation.owner.userId, {
        id: `bucket-invitation-${response}-${invitation.id}-${invitation.createdAt}`,
        kind:
          response === 'accepted'
            ? 'bucket_invitation_accepted'
            : 'bucket_invitation_declined',
        title:
          response === 'accepted'
            ? 'Bucket invitation accepted'
            : 'Bucket invitation declined',
        message: `${actor.displayName} ${response} the invitation to ${invitation.bucketTitle}.`,
        route: `/buckets/${bucketId}/collaborate`,
        entityType: 'bucket',
        entityId: bucketId,
        ...notificationActor(actor),
      });
    }
  }

  updateGroup(
    groupId: string,
    name: string,
    description: string,
  ): Promise<FriendGroup> {
    const actor = currentUser();
    const database = readSocialDatabase();
    const group = database.groups.find((candidate) => candidate.id === groupId);
    if (!group || group.ownerId !== actor.userId) {
      throw new Error('Only the group owner may edit it.');
    }
    const normalized = name.trim();
    if (!normalized) throw new Error('Group name is required.');
    group.name = normalized.slice(0, 80);
    group.description = description.trim().slice(0, 240);
    group.updatedAt = new Date().toISOString();
    for (const invitation of database.invitations) {
      if (invitation.groupId === groupId) invitation.groupName = group.name;
    }
    for (const grant of database.grants) {
      if (grant.subjectType === 'group' && grant.subjectId === groupId) {
        grant.subjectName = group.name;
      }
    }
    writeSocialDatabase(database);
    for (const member of group.members) {
      if (member.userId !== actor.userId && member.status === 'active') {
        pushLocalNotification(member.userId, {
          kind: 'group_updated',
          title: 'Group updated',
          message: `${actor.displayName} updated ${group.name}.`,
          route: '/social',
          entityType: 'group',
          entityId: groupId,
          ...notificationActor(actor),
        });
      }
    }
    return Promise.resolve(group);
  }

  removeGroupMember(groupId: string, memberId: string): Promise<void> {
    const actor = currentUser();
    const socialDatabase = readSocialDatabase();
    const appDatabase = readAppDatabase();
    const group = socialDatabase.groups.find(
      (candidate) => candidate.id === groupId,
    );
    if (!group || group.ownerId !== actor.userId) {
      throw new Error('Only the group owner may remove members.');
    }
    if (memberId === actor.userId) throw new Error('The group owner cannot be removed.');
    const member = group.members.find((candidate) => candidate.userId === memberId);
    if (!member || !['active', 'pending'].includes(member.status)) {
      throw new Error('Active or pending group member was not found.');
    }
    detachGroupAccess(appDatabase, socialDatabase, groupId, memberId);
    const timestamp = new Date().toISOString();
    member.status = 'removed';
    member.respondedAt = timestamp;
    group.updatedAt = timestamp;
    socialDatabase.invitations = socialDatabase.invitations.map((invitation) =>
      invitation.groupId === groupId && invitation.recipient.userId === memberId
        ? { ...invitation, status: 'removed', respondedAt: timestamp }
        : invitation,
    );
    writeAppDatabase(appDatabase);
    writeSocialDatabase(socialDatabase);
    pushLocalNotification(memberId, {
      kind: 'group_member_removed',
      title: 'Removed from group',
      message: `${actor.displayName} removed you from ${group.name}.`,
      route: '/social',
      entityType: 'group',
      entityId: groupId,
      ...notificationActor(actor),
    });
    return Promise.resolve();
  }

  leaveGroup(groupId: string): Promise<void> {
    const actor = currentUser();
    const socialDatabase = readSocialDatabase();
    const appDatabase = readAppDatabase();
    const group = socialDatabase.groups.find(
      (candidate) => candidate.id === groupId,
    );
    if (!group) throw new Error('Friend group was not found.');
    if (group.ownerId === actor.userId) {
      throw new Error('The group owner must delete the group instead.');
    }
    const member = group.members.find(
      (candidate) => candidate.userId === actor.userId,
    );
    if (!member || member.status !== 'active') {
      throw new Error('You are not an active member of this group.');
    }
    detachGroupAccess(appDatabase, socialDatabase, groupId, actor.userId);
    const timestamp = new Date().toISOString();
    member.status = 'left';
    member.respondedAt = timestamp;
    group.updatedAt = timestamp;
    socialDatabase.invitations = socialDatabase.invitations.map((invitation) =>
      invitation.groupId === groupId &&
      invitation.recipient.userId === actor.userId
        ? { ...invitation, status: 'left', respondedAt: timestamp }
        : invitation,
    );
    writeAppDatabase(appDatabase);
    writeSocialDatabase(socialDatabase);
    pushLocalNotification(group.ownerId, {
      kind: 'group_member_left',
      title: 'Member left group',
      message: `${actor.displayName} left ${group.name}.`,
      route: '/social',
      entityType: 'group',
      entityId: groupId,
      ...notificationActor(actor),
    });
    return Promise.resolve();
  }

  deleteGroup(groupId: string): Promise<void> {
    const actor = currentUser();
    const socialDatabase = readSocialDatabase();
    const appDatabase = readAppDatabase();
    const group = socialDatabase.groups.find(
      (candidate) => candidate.id === groupId,
    );
    if (!group || group.ownerId !== actor.userId) {
      throw new Error('Only the group owner may delete it.');
    }
    const recipients = group.members.filter(
      (member) => member.userId !== actor.userId && member.status === 'active',
    );
    for (const member of recipients) {
      detachGroupAccess(appDatabase, socialDatabase, groupId, member.userId);
    }
    socialDatabase.groups = socialDatabase.groups.filter(
      (candidate) => candidate.id !== groupId,
    );
    socialDatabase.invitations = socialDatabase.invitations.filter(
      (invitation) => invitation.groupId !== groupId,
    );
    socialDatabase.grants = socialDatabase.grants.filter(
      (grant) =>
        grant.subjectType !== 'group' || grant.subjectId !== groupId,
    );
    writeAppDatabase(appDatabase);
    writeSocialDatabase(socialDatabase);
    for (const member of recipients) {
      pushLocalNotification(member.userId, {
        kind: 'group_deleted',
        title: 'Group deleted',
        message: `${actor.displayName} deleted ${group.name}.`,
        route: '/social',
        entityType: 'group',
        entityId: groupId,
        ...notificationActor(actor),
      });
    }
    return Promise.resolve();
  }

  override async shareBucketWithGroup(
    bucketId: string,
    groupId: string,
    role: 'editor' | 'contributor' | 'viewer',
  ): Promise<BucketAccessGrant> {
    const actor = currentUser();
    const group = readSocialDatabase().groups.find(
      (candidate) => candidate.id === groupId,
    );
    const grant = await super.shareBucketWithGroup(bucketId, groupId, role);
    for (const member of group?.members ?? []) {
      if (member.userId !== actor.userId && member.status === 'active') {
        pushLocalNotification(member.userId, {
          kind: 'bucket_shared',
          title: 'Bucket shared',
          message: `${actor.displayName} shared a bucket with ${group?.name ?? 'your group'}.`,
          route: '/buckets',
          entityType: 'bucket',
          entityId: bucketId,
          ...notificationActor(actor),
        });
      }
    }
    return grant;
  }

  override async shareBucketWithUser(
    bucketId: string,
    userId: string,
    role: 'editor' | 'contributor' | 'viewer',
  ): Promise<BucketAccessGrant> {
    const actor = currentUser();
    const grant = await super.shareBucketWithUser(bucketId, userId, role);
    pushLocalNotification(userId, {
      kind: 'bucket_shared',
      title: 'Bucket shared',
      message: `${actor.displayName} shared a bucket with you.`,
      route: '/buckets',
      entityType: 'bucket',
      entityId: bucketId,
      ...notificationActor(actor),
    });
    return grant;
  }
}
