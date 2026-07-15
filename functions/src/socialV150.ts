import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  canInviteGroupMember,
  optionalText,
  removeAccessSource,
  requiredText,
  strongestRoleFromGrants,
  type ShareRole,
} from './socialDomain.js';
import {
  queueNotification,
  writeNotification,
  writeNotifications,
} from './notificationCore.js';

const REGION = 'europe-west1';
const GROUP_SOURCE_PREFIX = 'group_';

interface SocialUser {
  userId: string;
  displayName: string;
  email: string;
}

interface GroupRecord {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  owner: SocialUser;
  createdAt: string;
  updatedAt: string;
}

interface GroupMemberRecord extends SocialUser {
  status: 'pending' | 'active' | 'declined' | 'removed' | 'left';
  invitedBy: string;
  invitedAt: string;
  respondedAt: string | null;
}

interface GroupInvitationRecord {
  groupId: string;
  groupName: string;
  owner: SocialUser;
  recipient: SocialUser;
  status: 'pending' | 'active' | 'declined' | 'removed' | 'left';
  invitedAt: string;
  respondedAt: string | null;
}

interface BucketGrantRecord {
  id: string;
  bucketId: string;
  subjectType: 'user' | 'group';
  subjectId: string;
  subjectName: string;
  role: ShareRole;
  grantedBy: string;
  createdAt: string;
}

interface BucketMemberRecord {
  userId: string;
  displayName: string;
  email: string;
  role: 'owner' | ShareRole;
  status: 'active' | 'revoked' | 'left';
  canCreateCustomItems?: boolean;
  canSetCustomItemPrice?: boolean;
  invitedBy: string;
  joinedAt: string;
  updatedAt: string;
  accessSources?: string[];
}

const db = () => getFirestore();
const dataOf = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};

const authUser = (
  auth: { uid: string; token: Record<string, unknown> } | undefined,
): SocialUser => {
  if (!auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
  const email =
    typeof auth.token.email === 'string'
      ? auth.token.email.trim().toLowerCase()
      : '';
  const displayName =
    typeof auth.token.name === 'string' && auth.token.name.trim()
      ? auth.token.name.trim()
      : email.split('@')[0] || 'User';
  return { userId: auth.uid, displayName, email };
};

const invalidArgument = <T>(read: () => T): T => {
  try {
    return read();
  } catch (error) {
    throw new HttpsError(
      'invalid-argument',
      error instanceof Error ? error.message : 'The supplied data is invalid.',
    );
  }
};

const userSubcollection = (userId: string, name: string) =>
  db().collection('users').doc(userId).collection(name);

const ownedGroup = async (
  groupId: string,
  ownerId: string,
): Promise<{
  reference: FirebaseFirestore.DocumentReference;
  group: GroupRecord;
}> => {
  const reference = db().collection('friendGroups').doc(groupId);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Friend group was not found.');
  const group = snapshot.data() as GroupRecord;
  if (group.ownerId !== ownerId) {
    throw new HttpsError(
      'permission-denied',
      'Only the group owner may perform this action.',
    );
  }
  return { reference, group };
};

const revokeBucketMembership = async (
  bucketId: string,
  userId: string,
  member: BucketMemberRecord,
): Promise<void> => {
  const timestamp = new Date().toISOString();
  const batch = db().batch();
  batch.set(
    db().collection('buckets').doc(bucketId).collection('members').doc(userId),
    {
      status: 'revoked',
      accessSources: [],
      canCreateCustomItems: false,
      canSetCustomItemPrice: false,
      updatedAt: timestamp,
    },
    { merge: true },
  );
  batch.delete(userSubcollection(userId, 'bucketMemberships').doc(bucketId));
  await batch.commit();
};

const detachGroupAccess = async (
  bucketId: string,
  groupId: string,
  userId: string,
): Promise<void> => {
  const memberReference = db()
    .collection('buckets')
    .doc(bucketId)
    .collection('members')
    .doc(userId);
  const memberSnapshot = await memberReference.get();
  if (!memberSnapshot.exists) return;
  const member = memberSnapshot.data() as BucketMemberRecord;
  const accessSources = removeAccessSource(
    member.accessSources,
    `${GROUP_SOURCE_PREFIX}${groupId}`,
  );
  if (accessSources.length === 0) {
    await revokeBucketMembership(bucketId, userId, member);
    return;
  }

  const grantReferences = accessSources.map((sourceId) =>
    db()
      .collection('buckets')
      .doc(bucketId)
      .collection('accessGrants')
      .doc(sourceId),
  );
  const grantSnapshots = await db().getAll(...grantReferences);
  const grants = grantSnapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => snapshot.data() as BucketGrantRecord);
  const role = strongestRoleFromGrants(grants.map((grant) => grant.role));
  if (!role) {
    await revokeBucketMembership(bucketId, userId, member);
    return;
  }

  const timestamp = new Date().toISOString();
  const batch = db().batch();
  batch.set(
    memberReference,
    {
      role,
      status: 'active',
      accessSources,
      canCreateCustomItems: role === 'editor',
      canSetCustomItemPrice: role === 'editor',
      updatedAt: timestamp,
    },
    { merge: true },
  );
  batch.set(
    userSubcollection(userId, 'bucketMemberships').doc(bucketId),
    { role, accessSources, updatedAt: timestamp },
    { merge: true },
  );
  await batch.commit();
};

const groupGrants = async (
  groupReference: FirebaseFirestore.DocumentReference,
): Promise<BucketGrantRecord[]> => {
  const snapshot = await groupReference.collection('bucketGrants').get();
  return snapshot.docs.map((document) => document.data() as BucketGrantRecord);
};

const detachAllGroupAccess = async (
  groupReference: FirebaseFirestore.DocumentReference,
  groupId: string,
  userId: string,
): Promise<void> => {
  const grants = await groupGrants(groupReference);
  await Promise.all(
    grants.map((grant) => detachGroupAccess(grant.bucketId, groupId, userId)),
  );
};

export const unfriendV150 = onCall({ region: REGION }, async (request) => {
  const actor = authUser(request.auth);
  const friendId = invalidArgument(() =>
    requiredText(dataOf(request.data).friendId, 'Friend ID', 160),
  );
  if (friendId === actor.userId) {
    throw new HttpsError('failed-precondition', 'You cannot unfriend yourself.');
  }
  const actorFriendReference = userSubcollection(actor.userId, 'friends').doc(
    friendId,
  );
  const friendSnapshot = await actorFriendReference.get();
  if (!friendSnapshot.exists) throw new HttpsError('not-found', 'Friend was not found.');
  const friend = friendSnapshot.data() as SocialUser;
  const batch = db().batch();
  batch.delete(actorFriendReference);
  batch.delete(userSubcollection(friendId, 'friends').doc(actor.userId));
  for (const requestId of [
    `${actor.userId}_${friendId}`,
    `${friendId}_${actor.userId}`,
  ]) {
    batch.delete(userSubcollection(actor.userId, 'friendRequests').doc(requestId));
    batch.delete(userSubcollection(friendId, 'friendRequests').doc(requestId));
  }
  queueNotification(batch, friendId, {
    kind: 'friend_removed',
    title: 'Friend removed',
    message: `${actor.displayName} removed the friendship.`,
    route: '/social',
    entityType: 'friend',
    entityId: actor.userId,
    actorId: actor.userId,
    actorName: actor.displayName,
  });
  await batch.commit();
  return { success: true };
});

export const inviteFriendToGroupV150 = onCall(
  { region: REGION },
  async (request) => {
    const owner = authUser(request.auth);
    const input = dataOf(request.data);
    const groupId = invalidArgument(() =>
      requiredText(input.groupId, 'Group ID', 160),
    );
    const friendId = invalidArgument(() =>
      requiredText(input.friendId, 'Friend ID', 160),
    );
    const { reference, group } = await ownedGroup(groupId, owner.userId);
    const [friendSnapshot, memberSnapshot] = await Promise.all([
      userSubcollection(owner.userId, 'friends').doc(friendId).get(),
      reference.collection('members').doc(friendId).get(),
    ]);
    if (!friendSnapshot.exists) {
      throw new HttpsError(
        'failed-precondition',
        'Only accepted friends may be invited.',
      );
    }
    const existingStatus = memberSnapshot.exists
      ? (memberSnapshot.data() as GroupMemberRecord).status
      : null;
    if (!canInviteGroupMember(existingStatus)) {
      throw new HttpsError(
        'already-exists',
        'This friend is already in or invited to the group.',
      );
    }
    const friend = friendSnapshot.data() as SocialUser;
    const timestamp = new Date().toISOString();
    const member: GroupMemberRecord = {
      ...friend,
      status: 'pending',
      invitedBy: owner.userId,
      invitedAt: timestamp,
      respondedAt: null,
    };
    const invitation: GroupInvitationRecord = {
      groupId,
      groupName: group.name,
      owner,
      recipient: friend,
      status: 'pending',
      invitedAt: timestamp,
      respondedAt: null,
    };
    const batch = db().batch();
    batch.set(reference.collection('members').doc(friendId), member);
    batch.set(
      userSubcollection(friendId, 'groupInvitations').doc(groupId),
      invitation,
    );
    batch.delete(userSubcollection(friendId, 'groupMemberships').doc(groupId));
    batch.set(reference, { updatedAt: timestamp }, { merge: true });
    await batch.commit();
    return { success: true };
  },
);

export const updateFriendGroupV150 = onCall(
  { region: REGION },
  async (request) => {
    const owner = authUser(request.auth);
    const input = dataOf(request.data);
    const groupId = invalidArgument(() =>
      requiredText(input.groupId, 'Group ID', 160),
    );
    const name = invalidArgument(() =>
      requiredText(input.name, 'Group name', 80),
    );
    const description = optionalText(input.description, 240);
    const { reference, group } = await ownedGroup(groupId, owner.userId);
    const [membersSnapshot, grantsSnapshot] = await Promise.all([
      reference.collection('members').get(),
      reference.collection('bucketGrants').get(),
    ]);
    const timestamp = new Date().toISOString();
    const batch = db().batch();
    batch.set(reference, { name, description, updatedAt: timestamp }, { merge: true });
    const activeRecipients: string[] = [];
    for (const document of membersSnapshot.docs) {
      const member = document.data() as GroupMemberRecord;
      if (member.status === 'active') {
        batch.set(
          userSubcollection(member.userId, 'groupMemberships').doc(groupId),
          { groupName: name, updatedAt: timestamp },
          { merge: true },
        );
        if (member.userId !== owner.userId) activeRecipients.push(member.userId);
      }
      if (member.userId !== owner.userId) {
        batch.set(
          userSubcollection(member.userId, 'groupInvitations').doc(groupId),
          { groupName: name },
          { merge: true },
        );
      }
    }
    for (const document of grantsSnapshot.docs) {
      const grant = document.data() as BucketGrantRecord;
      batch.set(document.ref, { subjectName: name }, { merge: true });
      batch.set(
        db()
          .collection('buckets')
          .doc(grant.bucketId)
          .collection('accessGrants')
          .doc(grant.id),
        { subjectName: name },
        { merge: true },
      );
    }
    await batch.commit();
    await writeNotifications(activeRecipients, {
      kind: 'group_updated',
      title: 'Group updated',
      message: `${owner.displayName} updated ${name}.`,
      route: '/social',
      entityType: 'group',
      entityId: groupId,
      actorId: owner.userId,
      actorName: owner.displayName,
    });
    return { ...group, name, description, updatedAt: timestamp, members: membersSnapshot.docs.map((document) => document.data()) };
  },
);

export const removeFriendGroupMemberV150 = onCall(
  { region: REGION },
  async (request) => {
    const owner = authUser(request.auth);
    const input = dataOf(request.data);
    const groupId = invalidArgument(() =>
      requiredText(input.groupId, 'Group ID', 160),
    );
    const memberId = invalidArgument(() =>
      requiredText(input.memberId, 'Member ID', 160),
    );
    const { reference, group } = await ownedGroup(groupId, owner.userId);
    if (memberId === owner.userId) {
      throw new HttpsError('failed-precondition', 'The group owner cannot be removed.');
    }
    const memberReference = reference.collection('members').doc(memberId);
    const memberSnapshot = await memberReference.get();
    if (!memberSnapshot.exists) {
      throw new HttpsError('not-found', 'Group member was not found.');
    }
    const member = memberSnapshot.data() as GroupMemberRecord;
    if (member.status !== 'active' && member.status !== 'pending') {
      throw new HttpsError(
        'failed-precondition',
        'Only active or pending members may be removed.',
      );
    }
    if (member.status === 'active') {
      await detachAllGroupAccess(reference, groupId, memberId);
    }
    const timestamp = new Date().toISOString();
    const batch = db().batch();
    batch.set(
      memberReference,
      { status: 'removed', respondedAt: timestamp },
      { merge: true },
    );
    batch.set(
      userSubcollection(memberId, 'groupInvitations').doc(groupId),
      { status: 'removed', respondedAt: timestamp },
      { merge: true },
    );
    batch.delete(userSubcollection(memberId, 'groupMemberships').doc(groupId));
    batch.set(reference, { updatedAt: timestamp }, { merge: true });
    queueNotification(batch, memberId, {
      kind: 'group_member_removed',
      title: 'Removed from group',
      message: `${owner.displayName} removed you from ${group.name}.`,
      route: '/social',
      entityType: 'group',
      entityId: groupId,
      actorId: owner.userId,
      actorName: owner.displayName,
    });
    await batch.commit();
    return { success: true };
  },
);

export const leaveFriendGroupV150 = onCall(
  { region: REGION },
  async (request) => {
    const actor = authUser(request.auth);
    const groupId = invalidArgument(() =>
      requiredText(dataOf(request.data).groupId, 'Group ID', 160),
    );
    const reference = db().collection('friendGroups').doc(groupId);
    const [groupSnapshot, memberSnapshot] = await Promise.all([
      reference.get(),
      reference.collection('members').doc(actor.userId).get(),
    ]);
    if (!groupSnapshot.exists) throw new HttpsError('not-found', 'Friend group was not found.');
    const group = groupSnapshot.data() as GroupRecord;
    if (group.ownerId === actor.userId) {
      throw new HttpsError(
        'failed-precondition',
        'The group owner must delete the group instead.',
      );
    }
    if (!memberSnapshot.exists || memberSnapshot.data()?.status !== 'active') {
      throw new HttpsError(
        'failed-precondition',
        'You are not an active member of this group.',
      );
    }
    await detachAllGroupAccess(reference, groupId, actor.userId);
    const timestamp = new Date().toISOString();
    const batch = db().batch();
    batch.set(
      memberSnapshot.ref,
      { status: 'left', respondedAt: timestamp },
      { merge: true },
    );
    batch.set(
      userSubcollection(actor.userId, 'groupInvitations').doc(groupId),
      { status: 'left', respondedAt: timestamp },
      { merge: true },
    );
    batch.delete(userSubcollection(actor.userId, 'groupMemberships').doc(groupId));
    batch.set(reference, { updatedAt: timestamp }, { merge: true });
    queueNotification(batch, group.ownerId, {
      kind: 'group_member_left',
      title: 'Member left group',
      message: `${actor.displayName} left ${group.name}.`,
      route: '/social',
      entityType: 'group',
      entityId: groupId,
      actorId: actor.userId,
      actorName: actor.displayName,
    });
    await batch.commit();
    return { success: true };
  },
);

export const deleteFriendGroupV150 = onCall(
  { region: REGION },
  async (request) => {
    const owner = authUser(request.auth);
    const groupId = invalidArgument(() =>
      requiredText(dataOf(request.data).groupId, 'Group ID', 160),
    );
    const { reference, group } = await ownedGroup(groupId, owner.userId);
    const [membersSnapshot, grantsSnapshot] = await Promise.all([
      reference.collection('members').get(),
      reference.collection('bucketGrants').get(),
    ]);
    const activeRecipients = membersSnapshot.docs
      .map((document) => document.data() as GroupMemberRecord)
      .filter(
        (member) => member.userId !== owner.userId && member.status === 'active',
      );
    await Promise.all(
      activeRecipients.flatMap((member) =>
        grantsSnapshot.docs.map((document) =>
          detachGroupAccess(
            (document.data() as BucketGrantRecord).bucketId,
            groupId,
            member.userId,
          ),
        ),
      ),
    );

    const batch = db().batch();
    for (const document of membersSnapshot.docs) {
      const member = document.data() as GroupMemberRecord;
      batch.delete(document.ref);
      if (member.userId !== owner.userId) {
        batch.delete(userSubcollection(member.userId, 'groupInvitations').doc(groupId));
        batch.delete(userSubcollection(member.userId, 'groupMemberships').doc(groupId));
      }
    }
    batch.delete(userSubcollection(owner.userId, 'groupMemberships').doc(groupId));
    for (const document of grantsSnapshot.docs) {
      const grant = document.data() as BucketGrantRecord;
      batch.delete(document.ref);
      batch.delete(
        db()
          .collection('buckets')
          .doc(grant.bucketId)
          .collection('accessGrants')
          .doc(grant.id),
      );
    }
    batch.delete(reference);
    await batch.commit();
    await writeNotifications(
      activeRecipients.map((member) => member.userId),
      {
        kind: 'group_deleted',
        title: 'Group deleted',
        message: `${owner.displayName} deleted ${group.name}.`,
        route: '/social',
        entityType: 'group',
        entityId: groupId,
        actorId: owner.userId,
        actorName: owner.displayName,
      },
    );
    return { success: true };
  },
);
