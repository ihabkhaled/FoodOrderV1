import { createId } from '@/lib/id';
import type { Bucket, BucketMember } from '@/types/domain';
import type {
  BucketAccessGrant,
  FriendGroup,
  FriendRequest,
  GroupInvitation,
  SocialOverview,
  SocialService,
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
  buckets: Record<string, Bucket[]>;
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
  grants: BucketAccessGrant[];
}

type ShareRole = 'editor' | 'contributor' | 'viewer';

const rolePriority: Record<ShareRole, number> = {
  viewer: 1,
  contributor: 2,
  editor: 3,
};

const strongestRole = (
  current: BucketMember['role'] | undefined,
  requested: ShareRole,
): ShareRole => {
  const normalized: ShareRole =
    current === 'editor' || current === 'contributor' || current === 'viewer'
      ? current
      : 'viewer';
  return rolePriority[normalized] >= rolePriority[requested]
    ? normalized
    : requested;
};

const emptySocialDatabase = (): LocalSocialDatabase => ({
  requests: [],
  friends: {},
  groups: [],
  invitations: [],
  grants: [],
});

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
  if (!raw) return emptySocialDatabase();
  try {
    return {
      ...emptySocialDatabase(),
      ...(JSON.parse(raw) as LocalSocialDatabase),
    };
  } catch {
    return emptySocialDatabase();
  }
};

const writeSocialDatabase = (database: LocalSocialDatabase): void => {
  localStorage.setItem(SOCIAL_DATABASE_KEY, JSON.stringify(database));
};

const socialUser = (record: LocalUserRecord): SocialUser => ({
  userId: record.profile.id,
  displayName: record.profile.fullName,
  email: record.profile.email,
});

const currentUser = (): SocialUser => {
  const userId = localStorage.getItem(SESSION_KEY);
  const record = userId ? readAppDatabase().users[userId] : undefined;
  if (!record) throw new Error('Authentication is required.');
  return socialUser(record);
};

const addUniqueFriend = (
  database: LocalSocialDatabase,
  ownerId: string,
  friend: SocialUser,
): void => {
  const current = database.friends[ownerId] ?? [];
  if (!current.some((candidate) => candidate.userId === friend.userId)) {
    database.friends[ownerId] = [...current, friend];
  }
};

const activeGroupRecipients = (
  database: LocalSocialDatabase,
  groupId: string,
): SocialUser[] => {
  const group = database.groups.find((candidate) => candidate.id === groupId);
  if (!group) throw new Error('Friend group was not found.');
  return group.members
    .filter((member) => member.status === 'active')
    .map(({ userId, displayName, email }) => ({
      userId,
      displayName,
      email,
    }));
};

const updateBucketMember = (
  database: LocalAppDatabase,
  bucket: Bucket,
  recipient: SocialUser,
  role: ShareRole,
  sourceId: string,
): void => {
  const members = [...(database.sharing.members[bucket.id] ?? [])];
  const index = members.findIndex((member) => member.userId === recipient.userId);
  const existing = members[index] as
    | (BucketMember & { accessSources?: string[] })
    | undefined;
  const timestamp = new Date().toISOString();
  const effectiveRole = strongestRole(existing?.role, role);
  const saved: BucketMember & { accessSources: string[] } = {
    userId: recipient.userId,
    displayName: recipient.displayName,
    email: recipient.email,
    role: effectiveRole,
    status: 'active',
    canCreateCustomItems:
      existing?.canCreateCustomItems ?? effectiveRole === 'editor',
    canSetCustomItemPrice:
      existing?.canSetCustomItemPrice ?? effectiveRole === 'editor',
    invitedBy: bucket.ownerId,
    joinedAt: existing?.joinedAt ?? timestamp,
    updatedAt: timestamp,
    accessSources: [
      ...new Set([...(existing?.accessSources ?? []), sourceId]),
    ].sort((left, right) => left.localeCompare(right)),
  };
  if (index === -1) members.push(saved);
  else members[index] = saved;
  database.sharing.members[bucket.id] = members;
};

const materializeGrant = (
  grant: BucketAccessGrant,
  recipients: SocialUser[],
): void => {
  const database = readAppDatabase();
  const owned = database.buckets[grant.grantedBy] ?? [];
  const index = owned.findIndex((bucket) => bucket.id === grant.bucketId);
  const bucket = owned[index];
  if (!bucket || bucket.ownerId !== grant.grantedBy) {
    throw new Error('Only the bucket owner may share it.');
  }
  const shared: Bucket = {
    ...bucket,
    visibility: 'shared',
    revision: bucket.revision + 1,
    updatedAt: new Date().toISOString(),
  };
  owned[index] = shared;
  database.buckets[grant.grantedBy] = owned;
  for (const recipient of recipients) {
    if (recipient.userId !== grant.grantedBy) {
      updateBucketMember(database, shared, recipient, grant.role, grant.id);
    }
  }
  writeAppDatabase(database);
};

export class LocalSocialService implements SocialService {
  searchUserByEmail(email: string): Promise<SocialUser | null> {
    const normalized = email.trim().toLowerCase();
    const record = Object.values(readAppDatabase().users).find(
      (candidate) => candidate.profile.email.toLowerCase() === normalized,
    );
    return Promise.resolve(record ? socialUser(record) : null);
  }

  getOverview(): Promise<SocialOverview> {
    const actor = currentUser();
    const database = readSocialDatabase();
    return Promise.resolve({
      friends: database.friends[actor.userId] ?? [],
      incomingRequests: database.requests.filter(
        (request) =>
          request.recipient.userId === actor.userId &&
          request.status === 'pending',
      ),
      outgoingRequests: database.requests.filter(
        (request) =>
          request.sender.userId === actor.userId &&
          request.status === 'pending',
      ),
      groups: database.groups.filter(
        (group) =>
          group.ownerId === actor.userId ||
          group.members.some(
            (member) =>
              member.userId === actor.userId && member.status === 'active',
          ),
      ),
      groupInvitations: database.invitations.filter(
        (invitation) =>
          invitation.recipient.userId === actor.userId &&
          invitation.status === 'pending',
      ),
    });
  }

  async sendFriendRequest(email: string): Promise<FriendRequest> {
    const sender = currentUser();
    const recipient = await this.searchUserByEmail(email);
    if (!recipient) throw new Error('No user was found for that email.');
    if (recipient.userId === sender.userId) {
      throw new Error('You cannot add yourself as a friend.');
    }
    const database = readSocialDatabase();
    if (
      (database.friends[sender.userId] ?? []).some(
        (friend) => friend.userId === recipient.userId,
      )
    ) {
      throw new Error('You are already friends.');
    }
    const existing = database.requests.find(
      (request) =>
        request.status === 'pending' &&
        request.sender.userId === sender.userId &&
        request.recipient.userId === recipient.userId,
    );
    if (existing) return existing;
    const request: FriendRequest = {
      id: createId('friend-request'),
      sender,
      recipient,
      status: 'pending',
      createdAt: new Date().toISOString(),
      respondedAt: null,
    };
    database.requests.unshift(request);
    writeSocialDatabase(database);
    return request;
  }

  respondFriendRequest(
    senderId: string,
    response: 'accepted' | 'declined',
  ): Promise<void> {
    const recipient = currentUser();
    const database = readSocialDatabase();
    const request = database.requests.find(
      (candidate) =>
        candidate.sender.userId === senderId &&
        candidate.recipient.userId === recipient.userId &&
        candidate.status === 'pending',
    );
    if (!request) throw new Error('Friend request was not found.');
    request.status = response;
    request.respondedAt = new Date().toISOString();
    if (response === 'accepted') {
      addUniqueFriend(database, recipient.userId, request.sender);
      addUniqueFriend(database, request.sender.userId, recipient);
    }
    writeSocialDatabase(database);
    return Promise.resolve();
  }

  createGroup(name: string, description: string): Promise<FriendGroup> {
    const owner = currentUser();
    const normalized = name.trim();
    if (!normalized) throw new Error('Group name is required.');
    const timestamp = new Date().toISOString();
    const group: FriendGroup = {
      id: createId('friend-group'),
      ownerId: owner.userId,
      name: normalized.slice(0, 80),
      description: description.trim().slice(0, 240),
      members: [
        {
          ...owner,
          status: 'active',
          invitedBy: owner.userId,
          invitedAt: timestamp,
          respondedAt: timestamp,
        },
      ],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const database = readSocialDatabase();
    database.groups.unshift(group);
    writeSocialDatabase(database);
    return Promise.resolve(group);
  }

  inviteFriendToGroup(groupId: string, friendId: string): Promise<void> {
    const owner = currentUser();
    const database = readSocialDatabase();
    const group = database.groups.find((candidate) => candidate.id === groupId);
    if (!group || group.ownerId !== owner.userId) {
      throw new Error('Only the group owner may invite friends.');
    }
    const friend = (database.friends[owner.userId] ?? []).find(
      (candidate) => candidate.userId === friendId,
    );
    if (!friend) throw new Error('Friend was not found.');
    const timestamp = new Date().toISOString();
    const existing = group.members.find((member) => member.userId === friendId);
    if (existing?.status === 'active' || existing?.status === 'pending') {
      throw new Error('This friend is already in or invited to the group.');
    }
    const member = {
      ...friend,
      status: 'pending' as const,
      invitedBy: owner.userId,
      invitedAt: timestamp,
      respondedAt: null,
    };
    group.members = [
      ...group.members.filter((item) => item.userId !== friendId),
      member,
    ];
    group.updatedAt = timestamp;
    database.invitations = [
      ...database.invitations.filter(
        (invitation) =>
          invitation.groupId !== groupId ||
          invitation.recipient.userId !== friendId,
      ),
      {
        groupId,
        groupName: group.name,
        owner,
        recipient: friend,
        status: 'pending',
        invitedAt: timestamp,
        respondedAt: null,
      },
    ];
    writeSocialDatabase(database);
    return Promise.resolve();
  }

  respondGroupInvitation(
    groupId: string,
    response: 'active' | 'declined',
  ): Promise<void> {
    const recipient = currentUser();
    const database = readSocialDatabase();
    const group = database.groups.find((candidate) => candidate.id === groupId);
    const member = group?.members.find(
      (candidate) => candidate.userId === recipient.userId,
    );
    const invitation = database.invitations.find(
      (candidate) =>
        candidate.groupId === groupId &&
        candidate.recipient.userId === recipient.userId &&
        candidate.status === 'pending',
    );
    if (!group || !member || !invitation) {
      throw new Error('Group invitation was not found.');
    }
    const timestamp = new Date().toISOString();
    member.status = response;
    member.respondedAt = timestamp;
    invitation.status = response;
    invitation.respondedAt = timestamp;
    group.updatedAt = timestamp;
    writeSocialDatabase(database);
    if (response === 'active') {
      const grants = database.grants.filter(
        (grant) =>
          grant.subjectType === 'group' && grant.subjectId === groupId,
      );
      for (const grant of grants) materializeGrant(grant, [recipient]);
    }
    return Promise.resolve();
  }

  shareBucketWithGroup(
    bucketId: string,
    groupId: string,
    role: ShareRole,
  ): Promise<BucketAccessGrant> {
    const actor = currentUser();
    const database = readSocialDatabase();
    const group = database.groups.find((candidate) => candidate.id === groupId);
    if (!group || group.ownerId !== actor.userId) {
      throw new Error('Only your own friend groups can be shared with.');
    }
    const grant: BucketAccessGrant = {
      id: `group_${groupId}`,
      bucketId,
      subjectType: 'group',
      subjectId: groupId,
      subjectName: group.name,
      role,
      grantedBy: actor.userId,
      createdAt: new Date().toISOString(),
    };
    database.grants = [
      ...database.grants.filter(
        (candidate) =>
          candidate.bucketId !== bucketId || candidate.id !== grant.id,
      ),
      grant,
    ];
    writeSocialDatabase(database);
    materializeGrant(grant, activeGroupRecipients(database, groupId));
    return Promise.resolve(grant);
  }

  shareBucketWithUser(
    bucketId: string,
    userId: string,
    role: ShareRole,
  ): Promise<BucketAccessGrant> {
    const actor = currentUser();
    const database = readSocialDatabase();
    const friend = (database.friends[actor.userId] ?? []).find(
      (candidate) => candidate.userId === userId,
    );
    if (!friend) throw new Error('Only accepted friends can be selected.');
    const grant: BucketAccessGrant = {
      id: `user_${userId}`,
      bucketId,
      subjectType: 'user',
      subjectId: userId,
      subjectName: friend.displayName,
      role,
      grantedBy: actor.userId,
      createdAt: new Date().toISOString(),
    };
    database.grants = [
      ...database.grants.filter(
        (candidate) =>
          candidate.bucketId !== bucketId || candidate.id !== grant.id,
      ),
      grant,
    ];
    writeSocialDatabase(database);
    materializeGrant(grant, [friend]);
    return Promise.resolve(grant);
  }

  listBucketAccessGrants(bucketId: string): Promise<BucketAccessGrant[]> {
    return Promise.resolve(
      readSocialDatabase().grants.filter((grant) => grant.bucketId === bucketId),
    );
  }
}
