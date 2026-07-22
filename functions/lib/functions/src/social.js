import { randomUUID } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { queueTransactionNotification } from './notificationCore.js';
import { bucketInvitationId, bucketInvitationResponseAction, friendRequestId, materializedMemberAccess, normalizeEmail, optionalText, requiredText, shareRole, } from './socialDomain.js';
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
        : email.split('@', 1)[0] || 'User';
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
const bucketInvitationReference = (bucketId, recipientId) => db()
    .collection('buckets')
    .doc(bucketId)
    .collection('socialInvitations')
    .doc(recipientId);
const assertInvitationRecipient = (invitation, mirror, recipientId) => {
    if (invitation.recipient.userId !== recipientId ||
        mirror.recipient.userId !== recipientId ||
        invitation.id !== mirror.id) {
        throw new HttpsError('permission-denied', 'This bucket invitation belongs to another user.');
    }
};
const assertCompatibleDirectGrant = (grant, recipientId, ownerId) => {
    if (grant &&
        (grant.subjectType !== 'user' ||
            grant.subjectId !== recipientId ||
            grant.grantedBy !== ownerId)) {
        throw new HttpsError('failed-precondition', 'The existing direct access grant is not compatible with this invitation.');
    }
};
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
        const activeCurrent = current?.status === 'active' ? current : null;
        const timestamp = new Date().toISOString();
        const access = materializedMemberAccess(current, grant.role, grant.id);
        const member = {
            userId: recipient.userId,
            displayName: recipient.displayName,
            email: recipient.email,
            role: access.role,
            status: 'active',
            canCreateCustomItems: access.canCreateCustomItems,
            canSetCustomItemPrice: access.canSetCustomItemPrice,
            invitedBy: grant.grantedBy,
            joinedAt: activeCurrent?.joinedAt ?? timestamp,
            updatedAt: timestamp,
            accessSources: access.accessSources,
        };
        transaction.set(memberReference, member, { merge: true });
        transaction.set(mirrorReference, {
            bucketId,
            role: member.role,
            bucketTitle: bucket.title,
            ownerName: bucket.ownerName,
            joinedAt: activeCurrent?.joinedAt ?? timestamp,
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
    const [friends, requests, invitations, bucketInvitations, memberships,] = await Promise.all([
        activeFriends(actor.userId),
        userSubcollection(actor.userId, 'friendRequests').get(),
        userSubcollection(actor.userId, 'groupInvitations').get(),
        userSubcollection(actor.userId, 'bucketInvitations').get(),
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
        bucketInvitations: bucketInvitations.docs
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
export const inviteFriendToBucketV151 = onCall({ region: REGION }, async (request) => {
    const owner = authUser(request.auth);
    const input = dataOf(request.data);
    const bucketId = invalidArgument(() => requiredText(input.bucketId, 'Bucket ID', 160));
    const friendId = invalidArgument(() => requiredText(input.friendId, 'Friend ID', 160));
    const role = invalidArgument(() => shareRole(input.role));
    const bucketReference = db().collection('buckets').doc(bucketId);
    const friendReference = userSubcollection(owner.userId, 'friends').doc(friendId);
    const grantReference = bucketReference
        .collection('accessGrants')
        .doc(`user_${friendId}`);
    const invitationReference = bucketInvitationReference(bucketId, friendId);
    const mirrorReference = userSubcollection(friendId, 'bucketInvitations').doc(bucketId);
    return db().runTransaction(async (transaction) => {
        const [bucketSnapshot, friendSnapshot, grantSnapshot, invitationSnapshot,] = await Promise.all([
            transaction.get(bucketReference),
            transaction.get(friendReference),
            transaction.get(grantReference),
            transaction.get(invitationReference),
        ]);
        if (!bucketSnapshot.exists) {
            throw new HttpsError('not-found', 'Bucket was not found.');
        }
        const bucket = bucketSnapshot.data();
        if (bucket.ownerId !== owner.userId) {
            throw new HttpsError('permission-denied', 'Only the bucket owner may invite friends.');
        }
        if (!friendSnapshot.exists) {
            throw new HttpsError('failed-precondition', 'Only accepted friends may be invited.');
        }
        if (grantSnapshot.exists) {
            throw new HttpsError('already-exists', 'This bucket is already shared with that friend.');
        }
        if (invitationSnapshot.exists) {
            const existing = invitationSnapshot.data();
            if (existing.status === 'pending') {
                transaction.set(mirrorReference, existing);
                return existing;
            }
        }
        const recipient = friendSnapshot.data();
        const timestamp = new Date().toISOString();
        const invitation = {
            id: bucketInvitationId(bucketId, friendId),
            bucketId,
            bucketTitle: bucket.title,
            owner,
            recipient,
            role,
            status: 'pending',
            createdAt: timestamp,
            respondedAt: null,
        };
        transaction.set(invitationReference, invitation);
        transaction.set(mirrorReference, invitation);
        queueTransactionNotification(transaction, friendId, {
            id: `bucket_invitation_${invitation.id}_${timestamp}`,
            kind: 'bucket_invitation',
            title: 'New bucket invitation',
            message: `${owner.displayName} invited you to ${bucket.title}.`,
            route: '/social',
            entityType: 'bucket',
            entityId: bucketId,
            actorId: owner.userId,
            actorName: owner.displayName,
            createdAt: timestamp,
        });
        return invitation;
    });
});
export const respondBucketInvitationV151 = onCall({ region: REGION }, async (request) => {
    const recipient = authUser(request.auth);
    const input = dataOf(request.data);
    const bucketId = invalidArgument(() => requiredText(input.bucketId, 'Bucket ID', 160));
    if (input.response !== 'accepted' && input.response !== 'declined') {
        throw new HttpsError('invalid-argument', 'A valid response is required.');
    }
    const response = input.response;
    const bucketReference = db().collection('buckets').doc(bucketId);
    const invitationReference = bucketInvitationReference(bucketId, recipient.userId);
    const mirrorReference = userSubcollection(recipient.userId, 'bucketInvitations').doc(bucketId);
    const grantReference = bucketReference
        .collection('accessGrants')
        .doc(`user_${recipient.userId}`);
    const memberReference = bucketReference
        .collection('members')
        .doc(recipient.userId);
    const membershipReference = userSubcollection(recipient.userId, 'bucketMemberships').doc(bucketId);
    await db().runTransaction(async (transaction) => {
        const [invitationSnapshot, mirrorSnapshot, bucketSnapshot, grantSnapshot, memberSnapshot,] = await Promise.all([
            transaction.get(invitationReference),
            transaction.get(mirrorReference),
            transaction.get(bucketReference),
            transaction.get(grantReference),
            transaction.get(memberReference),
        ]);
        if (response === 'declined' &&
            !bucketSnapshot.exists &&
            !invitationSnapshot.exists &&
            !mirrorSnapshot.exists) {
            return;
        }
        if (!invitationSnapshot.exists || !mirrorSnapshot.exists) {
            throw new HttpsError('not-found', 'Bucket invitation was not found.');
        }
        const invitation = invitationSnapshot.data();
        const mirror = mirrorSnapshot.data();
        assertInvitationRecipient(invitation, mirror, recipient.userId);
        const action = bucketInvitationResponseAction(invitation.status, response, bucketSnapshot.exists);
        if (action === 'idempotent')
            return;
        if (action === 'invalid') {
            throw new HttpsError('failed-precondition', 'Bucket invitation has already been answered.');
        }
        const timestamp = new Date().toISOString();
        if (action === 'dismiss') {
            transaction.delete(invitationReference);
            transaction.delete(mirrorReference);
            return;
        }
        transaction.set(invitationReference, { status: response, respondedAt: timestamp }, { merge: true });
        transaction.set(mirrorReference, { status: response, respondedAt: timestamp }, { merge: true });
        if (action === 'decline') {
            queueTransactionNotification(transaction, invitation.owner.userId, {
                id: `bucket_invitation_declined_${invitation.id}_${invitation.createdAt}`,
                kind: 'bucket_invitation_declined',
                title: 'Bucket invitation declined',
                message: `${recipient.displayName} declined the invitation to ${invitation.bucketTitle}.`,
                route: `/buckets/${bucketId}/collaborate`,
                entityType: 'bucket',
                entityId: bucketId,
                actorId: recipient.userId,
                actorName: recipient.displayName,
                createdAt: timestamp,
            });
            return;
        }
        if (action === 'missing-bucket') {
            throw new HttpsError('not-found', 'Bucket was not found.');
        }
        const bucket = bucketSnapshot.data();
        if (bucket.ownerId !== invitation.owner.userId) {
            throw new HttpsError('failed-precondition', 'Bucket ownership no longer matches this invitation.');
        }
        const existingGrant = grantSnapshot.exists
            ? grantSnapshot.data()
            : null;
        assertCompatibleDirectGrant(existingGrant, recipient.userId, invitation.owner.userId);
        const grant = existingGrant ?? {
            id: `user_${recipient.userId}`,
            bucketId,
            subjectType: 'user',
            subjectId: recipient.userId,
            subjectName: recipient.displayName,
            role: invitation.role,
            grantedBy: invitation.owner.userId,
            createdAt: timestamp,
            invitationId: invitation.id,
        };
        if (!existingGrant)
            transaction.set(grantReference, grant);
        const current = memberSnapshot.exists
            ? memberSnapshot.data()
            : null;
        const activeCurrent = current?.status === 'active' ? current : null;
        const access = materializedMemberAccess(current, grant.role, grant.id);
        transaction.set(memberReference, {
            userId: recipient.userId,
            displayName: recipient.displayName,
            email: recipient.email,
            role: access.role,
            status: 'active',
            canCreateCustomItems: access.canCreateCustomItems,
            canSetCustomItemPrice: access.canSetCustomItemPrice,
            invitedBy: invitation.owner.userId,
            joinedAt: activeCurrent?.joinedAt ?? timestamp,
            updatedAt: timestamp,
            accessSources: access.accessSources,
        }, { merge: true });
        transaction.set(membershipReference, {
            bucketId,
            role: access.role,
            bucketTitle: bucket.title,
            ownerName: bucket.ownerName,
            joinedAt: activeCurrent?.joinedAt ?? timestamp,
            accessSources: access.accessSources,
        }, { merge: true });
        if (!existingGrant || bucket.visibility !== 'shared') {
            transaction.set(bucketReference, {
                visibility: 'shared',
                revision: Math.max(1, bucket.revision) + 1,
                updatedAt: timestamp,
                lastSocialAccessChangeAt: timestamp,
            }, { merge: true });
        }
        queueTransactionNotification(transaction, invitation.owner.userId, {
            id: `bucket_invitation_accepted_${invitation.id}_${invitation.createdAt}`,
            kind: 'bucket_invitation_accepted',
            title: 'Bucket invitation accepted',
            message: `${recipient.displayName} accepted the invitation to ${invitation.bucketTitle}.`,
            route: `/buckets/${bucketId}/collaborate`,
            entityType: 'bucket',
            entityId: bucketId,
            actorId: recipient.userId,
            actorName: recipient.displayName,
            createdAt: timestamp,
        });
    });
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
        .toSorted((left, right) => right.createdAt.localeCompare(left.createdAt));
});
