import { randomUUID } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { friendRequestId, mergeAccessSources, normalizeEmail, optionalText, requiredText, shareRole, strongestRole, } from './socialDomain.js';
const REGION = 'europe-west1';
const db = () => getFirestore();
const dataOf = (value) => typeof value === 'object' && value !== null
    ? value
    : {};
const authUser = (auth) => {
    if (!auth)
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    const email = typeof auth.token.email === 'string'
        ? auth.token.email.trim().toLowerCase()
        : '';
    const displayName = typeof auth.token.name === 'string' && auth.token.name.trim()
        ? auth.token.name.trim()
        : email.split('@')[0] || 'User';
    return { userId: auth.uid, displayName, email };
};
const invalidArgument = (read) => {
    try {
        return read();
    }
    catch (error) {
        throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'The supplied data is invalid.');
    }
};
const profileFromData = (userId, value) => ({
    userId,
    displayName: typeof value.displayName === 'string'
        ? value.displayName
        : typeof value.fullName === 'string'
            ? value.fullName
            : 'User',
    email: typeof value.email === 'string' ? value.email.toLowerCase() : '',
});
const publishActor = async (actor) => {
    if (!actor.email)
        return;
    await db().collection('publicProfiles').doc(actor.userId).set({
        userId: actor.userId,
        displayName: actor.displayName,
        email: actor.email,
        emailNormalized: actor.email,
        updatedAt: new Date().toISOString(),
    }, { merge: true });
};
const findUserByEmail = async (email) => {
    const publicMatch = await db()
        .collection('publicProfiles')
        .where('emailNormalized', '==', email)
        .limit(1)
        .get();
    const publicDocument = publicMatch.docs[0];
    if (publicDocument) {
        return profileFromData(publicDocument.id, publicDocument.data());
    }
    const legacyMatch = await db()
        .collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
    const legacyDocument = legacyMatch.docs[0];
    if (!legacyDocument)
        return null;
    const user = profileFromData(legacyDocument.id, legacyDocument.data());
    await publishActor(user);
    return user;
};
const userSubcollection = (userId, name) => db().collection('users').doc(userId).collection(name);
const activeFriends = async (userId) => {
    const snapshot = await userSubcollection(userId, 'friends').get();
    return snapshot.docs.map((document) => document.data());
};
const groupView = async (groupId) => {
    const groupDocument = await db().collection('friendGroups').doc(groupId).get();
    if (!groupDocument.exists)
        return null;
    const members = await groupDocument.ref.collection('members').get();
    return {
        ...groupDocument.data(),
        members: members.docs.map((document) => document.data()),
    };
};
const materializeBucketMember = async (bucketId, recipient, grant) => {
    if (recipient.userId === grant.grantedBy)
        return;
    const bucketReference = db().collection('buckets').doc(bucketId);
    const memberReference = bucketReference
        .collection('members')
        .doc(recipient.userId);
    const mirrorReference = userSubcollection(recipient.userId, 'bucketMemberships').doc(bucketId);
    await db().runTransaction(async (transaction) => {
        const [bucketSnapshot, memberSnapshot] = await Promise.all([
            transaction.get(bucketReference),
            transaction.get(memberReference),
        ]);
        if (!bucketSnapshot.exists) {
            throw new HttpsError('not-found', 'Bucket was not found.');
        }
        const bucket = bucketSnapshot.data();
        const current = memberSnapshot.exists
            ? memberSnapshot.data()
            : null;
        const timestamp = new Date().toISOString();
        const member = {
            userId: recipient.userId,
            displayName: recipient.displayName,
            email: recipient.email,
            role: strongestRole(current?.role, grant.role),
            status: 'active',
            canCreateCustomItems: current?.canCreateCustomItems ?? grant.role === 'editor',
            canSetCustomItemPrice: current?.canSetCustomItemPrice ?? grant.role === 'editor',
            invitedBy: grant.grantedBy,
            joinedAt: current?.joinedAt ?? timestamp,
            updatedAt: timestamp,
            accessSources: mergeAccessSources(current?.accessSources, grant.id),
        };
        transaction.set(memberReference, member, { merge: true });
        transaction.set(mirrorReference, {
            bucketId,
            role: member.role,
            bucketTitle: bucket.title,
            ownerName: bucket.ownerName,
            joinedAt: current?.joinedAt ?? timestamp,
            accessSources: member.accessSources,
        }, { merge: true });
    });
};
const ensureBucketOwner = async (bucketId, ownerId) => {
    const reference = db().collection('buckets').doc(bucketId);
    const snapshot = await reference.get();
    if (!snapshot.exists)
        throw new HttpsError('not-found', 'Bucket was not found.');
    const bucket = snapshot.data();
    if (bucket.ownerId !== ownerId) {
        throw new HttpsError('permission-denied', 'Only the bucket owner may share it.');
    }
    return { reference, bucket };
};
const createGrant = async (actor, bucketId, subjectType, subjectId, subjectName, role) => {
    const { reference, bucket } = await ensureBucketOwner(bucketId, actor.userId);
    const grant = {
        id: `${subjectType}_${subjectId}`,
        bucketId,
        subjectType,
        subjectId,
        subjectName,
        role,
        grantedBy: actor.userId,
        createdAt: new Date().toISOString(),
    };
    const batch = db().batch();
    batch.set(reference.collection('accessGrants').doc(grant.id), grant);
    batch.set(reference, {
        visibility: 'shared',
        revision: Math.max(1, bucket.revision) + 1,
        updatedAt: grant.createdAt,
    }, { merge: true });
    if (subjectType === 'group') {
        batch.set(db()
            .collection('friendGroups')
            .doc(subjectId)
            .collection('bucketGrants')
            .doc(bucketId), grant);
    }
    await batch.commit();
    return grant;
};
export const searchSocialUserByEmail = onCall({ region: REGION }, async (request) => {
    const actor = authUser(request.auth);
    await publishActor(actor);
    const input = dataOf(request.data);
    const email = invalidArgument(() => normalizeEmail(input.email));
    const found = await findUserByEmail(email);
    return found?.userId === actor.userId ? null : found;
});
export const getSocialOverview = onCall({ region: REGION }, async (request) => {
    const actor = authUser(request.auth);
    await publishActor(actor);
    const [friends, requests, invitations, memberships] = await Promise.all([
        activeFriends(actor.userId),
        userSubcollection(actor.userId, 'friendRequests').get(),
        userSubcollection(actor.userId, 'groupInvitations').get(),
        userSubcollection(actor.userId, 'groupMemberships').get(),
    ]);
    const requestRecords = requests.docs.map((document) => document.data());
    const groupResults = await Promise.all(memberships.docs.map((document) => groupView(document.id)));
    const groups = groupResults.filter((group) => group !== null);
    return {
        friends,
        incomingRequests: requestRecords.filter((item) => item.recipient.userId === actor.userId && item.status === 'pending'),
        outgoingRequests: requestRecords.filter((item) => item.sender.userId === actor.userId && item.status === 'pending'),
        groups,
        groupInvitations: invitations.docs
            .map((document) => document.data())
            .filter((item) => item.status === 'pending'),
    };
});
export const sendFriendRequest = onCall({ region: REGION }, async (request) => {
    const sender = authUser(request.auth);
    await publishActor(sender);
    const email = invalidArgument(() => normalizeEmail(dataOf(request.data).email));
    const recipient = await findUserByEmail(email);
    if (!recipient) {
        throw new HttpsError('not-found', 'No user was found for that email.');
    }
    if (recipient.userId === sender.userId) {
        throw new HttpsError('failed-precondition', 'You cannot add yourself as a friend.');
    }
    const existingFriendReference = userSubcollection(sender.userId, 'friends').doc(recipient.userId);
    const existingFriend = await existingFriendReference.get();
    if (existingFriend.exists) {
        throw new HttpsError('already-exists', 'You are already friends.');
    }
    const id = friendRequestId(sender.userId, recipient.userId);
    const senderReference = userSubcollection(sender.userId, 'friendRequests').doc(id);
    const recipientReference = userSubcollection(recipient.userId, 'friendRequests').doc(id);
    const existing = await senderReference.get();
    if (existing.exists && existing.data()?.status === 'pending') {
        return existing.data();
    }
    const record = {
        id,
        sender,
        recipient,
        status: 'pending',
        createdAt: new Date().toISOString(),
        respondedAt: null,
    };
    const batch = db().batch();
    batch.set(senderReference, record);
    batch.set(recipientReference, record);
    await batch.commit();
    return record;
});
export const respondFriendRequest = onCall({ region: REGION }, async (request) => {
    const recipient = authUser(request.auth);
    const input = dataOf(request.data);
    const senderId = invalidArgument(() => requiredText(input.senderId, 'Sender ID', 160));
    const response = input.response;
    if (response !== 'accepted' && response !== 'declined') {
        throw new HttpsError('invalid-argument', 'A valid response is required.');
    }
    const id = friendRequestId(senderId, recipient.userId);
    const recipientReference = userSubcollection(recipient.userId, 'friendRequests').doc(id);
    const requestSnapshot = await recipientReference.get();
    if (!requestSnapshot.exists) {
        throw new HttpsError('not-found', 'Friend request was not found.');
    }
    const record = requestSnapshot.data();
    if (record.status !== 'pending' ||
        record.recipient.userId !== recipient.userId) {
        throw new HttpsError('failed-precondition', 'Friend request is no longer pending.');
    }
    const timestamp = new Date().toISOString();
    const update = { status: response, respondedAt: timestamp };
    const batch = db().batch();
    batch.set(recipientReference, update, { merge: true });
    batch.set(userSubcollection(senderId, 'friendRequests').doc(id), update, { merge: true });
    if (response === 'accepted') {
        batch.set(userSubcollection(recipient.userId, 'friends').doc(senderId), record.sender);
        batch.set(userSubcollection(senderId, 'friends').doc(recipient.userId), recipient);
    }
    await batch.commit();
    return { success: true };
});
export const createFriendGroup = onCall({ region: REGION }, async (request) => {
    const owner = authUser(request.auth);
    const input = dataOf(request.data);
    const name = invalidArgument(() => requiredText(input.name, 'Group name', 80));
    const description = optionalText(input.description, 240);
    const timestamp = new Date().toISOString();
    const group = {
        id: randomUUID(),
        ownerId: owner.userId,
        name,
        description,
        owner,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    const member = {
        ...owner,
        status: 'active',
        invitedBy: owner.userId,
        invitedAt: timestamp,
        respondedAt: timestamp,
    };
    const groupReference = db().collection('friendGroups').doc(group.id);
    const batch = db().batch();
    batch.set(groupReference, group);
    batch.set(groupReference.collection('members').doc(owner.userId), member);
    batch.set(userSubcollection(owner.userId, 'groupMemberships').doc(group.id), {
        groupId: group.id,
        groupName: group.name,
        ownerId: owner.userId,
        status: 'active',
        updatedAt: timestamp,
    });
    await batch.commit();
    return { ...group, members: [member] };
});
export const inviteFriendToGroup = onCall({ region: REGION }, async (request) => {
    const owner = authUser(request.auth);
    const input = dataOf(request.data);
    const groupId = invalidArgument(() => requiredText(input.groupId, 'Group ID', 160));
    const friendId = invalidArgument(() => requiredText(input.friendId, 'Friend ID', 160));
    const [groupSnapshot, friendSnapshot] = await Promise.all([
        db().collection('friendGroups').doc(groupId).get(),
        userSubcollection(owner.userId, 'friends').doc(friendId).get(),
    ]);
    if (!groupSnapshot.exists ||
        groupSnapshot.data()?.ownerId !== owner.userId) {
        throw new HttpsError('permission-denied', 'Only the group owner may invite friends.');
    }
    if (!friendSnapshot.exists) {
        throw new HttpsError('failed-precondition', 'Only accepted friends may be invited.');
    }
    const friend = friendSnapshot.data();
    const group = groupSnapshot.data();
    const timestamp = new Date().toISOString();
    const member = {
        ...friend,
        status: 'pending',
        invitedBy: owner.userId,
        invitedAt: timestamp,
        respondedAt: null,
    };
    const invitation = {
        groupId,
        groupName: group.name,
        owner,
        recipient: friend,
        status: 'pending',
        invitedAt: timestamp,
        respondedAt: null,
    };
    const batch = db().batch();
    batch.set(groupSnapshot.ref.collection('members').doc(friendId), member);
    batch.set(userSubcollection(friendId, 'groupInvitations').doc(groupId), invitation);
    batch.set(groupSnapshot.ref, { updatedAt: timestamp }, { merge: true });
    await batch.commit();
    return { success: true };
});
export const respondFriendGroupInvitation = onCall({ region: REGION }, async (request) => {
    const recipient = authUser(request.auth);
    const input = dataOf(request.data);
    const groupId = invalidArgument(() => requiredText(input.groupId, 'Group ID', 160));
    const response = input.response;
    if (response !== 'active' && response !== 'declined') {
        throw new HttpsError('invalid-argument', 'A valid response is required.');
    }
    const invitationReference = userSubcollection(recipient.userId, 'groupInvitations').doc(groupId);
    const invitationSnapshot = await invitationReference.get();
    if (!invitationSnapshot.exists ||
        invitationSnapshot.data()?.status !== 'pending') {
        throw new HttpsError('not-found', 'Group invitation was not found.');
    }
    const groupReference = db().collection('friendGroups').doc(groupId);
    const timestamp = new Date().toISOString();
    const batch = db().batch();
    batch.set(invitationReference, { status: response, respondedAt: timestamp }, { merge: true });
    batch.set(groupReference.collection('members').doc(recipient.userId), { status: response, respondedAt: timestamp }, { merge: true });
    if (response === 'active') {
        const invitation = invitationSnapshot.data();
        batch.set(userSubcollection(recipient.userId, 'groupMemberships').doc(groupId), {
            groupId,
            groupName: invitation.groupName,
            ownerId: invitation.owner.userId,
            status: 'active',
            updatedAt: timestamp,
        });
    }
    await batch.commit();
    if (response === 'active') {
        const grants = await groupReference.collection('bucketGrants').get();
        await Promise.all(grants.docs.map((document) => materializeBucketMember(document.data().bucketId, recipient, document.data())));
    }
    return { success: true };
});
export const shareBucketWithFriendGroup = onCall({ region: REGION }, async (request) => {
    const actor = authUser(request.auth);
    const input = dataOf(request.data);
    const bucketId = invalidArgument(() => requiredText(input.bucketId, 'Bucket ID', 160));
    const groupId = invalidArgument(() => requiredText(input.groupId, 'Group ID', 160));
    const role = invalidArgument(() => shareRole(input.role));
    const groupReference = db().collection('friendGroups').doc(groupId);
    const groupSnapshot = await groupReference.get();
    if (!groupSnapshot.exists ||
        groupSnapshot.data()?.ownerId !== actor.userId) {
        throw new HttpsError('permission-denied', 'Only your own friend groups can be shared with.');
    }
    const group = groupSnapshot.data();
    const grant = await createGrant(actor, bucketId, 'group', groupId, group.name, role);
    const members = await groupReference
        .collection('members')
        .where('status', '==', 'active')
        .get();
    await Promise.all(members.docs.map((document) => materializeBucketMember(bucketId, document.data(), grant)));
    return grant;
});
export const shareBucketWithFriend = onCall({ region: REGION }, async (request) => {
    const actor = authUser(request.auth);
    const input = dataOf(request.data);
    const bucketId = invalidArgument(() => requiredText(input.bucketId, 'Bucket ID', 160));
    const userId = invalidArgument(() => requiredText(input.userId, 'User ID', 160));
    const role = invalidArgument(() => shareRole(input.role));
    const friendReference = userSubcollection(actor.userId, 'friends').doc(userId);
    const friendSnapshot = await friendReference.get();
    if (!friendSnapshot.exists) {
        throw new HttpsError('failed-precondition', 'Only accepted friends can be selected.');
    }
    const friend = friendSnapshot.data();
    const grant = await createGrant(actor, bucketId, 'user', userId, friend.displayName, role);
    await materializeBucketMember(bucketId, friend, grant);
    return grant;
});
export const listBucketAccessGrants = onCall({ region: REGION }, async (request) => {
    const actor = authUser(request.auth);
    const bucketId = invalidArgument(() => requiredText(dataOf(request.data).bucketId, 'Bucket ID', 160));
    const { reference } = await ensureBucketOwner(bucketId, actor.userId);
    const snapshot = await reference.collection('accessGrants').get();
    return snapshot.docs
        .map((document) => document.data())
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
});
