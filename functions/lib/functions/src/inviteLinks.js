import { randomBytes } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { INVITE_LINK_EXPIRY_HOURS, inviteLinkLimits, isInviteLinkKind, isInviteLinkUsable, parseInviteLinkToken, shareRoleOrDefault, } from './inviteLinkDomain.js';
const REGION = 'europe-west1';
const db = () => getFirestore();
const dataOf = (value) => typeof value === 'object' && value !== null ? value : {};
const authUser = (auth) => {
    if (!auth)
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    const email = typeof auth.token.email === 'string' ? auth.token.email.trim().toLowerCase() : '';
    const displayName = typeof auth.token.name === 'string' && auth.token.name.trim()
        ? auth.token.name.trim()
        : email.split('@', 1)[0] || 'User';
    return { userId: auth.uid, displayName, email };
};
const userSubcollection = (userId, name) => db().collection('users').doc(userId).collection(name);
const inviteLinkReference = (token) => db().collection('inviteLinks').doc(token);
/** 128 bits from the Node CSPRNG. The token is the entire secret. */
const generateToken = () => randomBytes(16).toString('hex');
const requiredText = (value, label, max) => {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text || text.length > max) {
        throw new HttpsError('invalid-argument', `${label} is required.`);
    }
    return text;
};
const readUsableLink = async (rawToken) => {
    const token = parseInviteLinkToken(rawToken);
    // A malformed token is indistinguishable from a missing one on purpose: the
    // caller learns nothing about which links exist.
    if (!token)
        throw new HttpsError('not-found', 'This invite link is not valid.');
    const snapshot = await inviteLinkReference(token).get();
    if (!snapshot.exists)
        throw new HttpsError('not-found', 'This invite link is not valid.');
    const link = snapshot.data();
    if (!isInviteLinkUsable(link)) {
        throw new HttpsError('failed-precondition', 'This invite link has expired or was revoked.');
    }
    return link;
};
const assertBucketOwner = async (bucketId, userId) => {
    const snapshot = await db().collection('buckets').doc(bucketId).get();
    if (!snapshot.exists)
        throw new HttpsError('not-found', 'Bucket was not found.');
    const bucket = snapshot.data();
    if (bucket.ownerId !== userId) {
        throw new HttpsError('permission-denied', 'Only the bucket owner can create invite links.');
    }
    return typeof bucket.title === 'string' ? bucket.title : 'A bucket';
};
const assertGroupOwner = async (groupId, userId) => {
    const snapshot = await db().collection('friendGroups').doc(groupId).get();
    if (!snapshot.exists)
        throw new HttpsError('not-found', 'Group was not found.');
    const group = snapshot.data();
    if (group.ownerId !== userId) {
        throw new HttpsError('permission-denied', 'Only the group owner can create invite links.');
    }
    return typeof group.name === 'string' ? group.name : 'A group';
};
/**
 * Creates a shareable invite link.
 *
 * Ownership is proven here rather than in Security Rules because the token is
 * the only credential the redeemer will present: the document must be correct
 * at the moment it is written.
 */
export const createInviteLinkV1100 = onCall({ region: REGION }, async (request) => {
    const actor = authUser(request.auth);
    const input = dataOf(request.data);
    if (!isInviteLinkKind(input.kind)) {
        throw new HttpsError('invalid-argument', 'A valid invite kind is required.');
    }
    const kind = input.kind;
    // One person cannot fill the collection with links; old ones must be revoked
    // or allowed to expire first.
    const existing = await db()
        .collection('inviteLinks')
        .where('createdBy', '==', actor.userId)
        .where('kind', '==', kind)
        .where('revoked', '==', false)
        .get();
    const live = existing.docs.filter((document) => isInviteLinkUsable(document.data()));
    if (live.length >= inviteLinkLimits.perUserPerKind) {
        throw new HttpsError('resource-exhausted', `You already have ${inviteLinkLimits.perUserPerKind} active ${kind} links. Revoke one first.`);
    }
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + INVITE_LINK_EXPIRY_HOURS[kind] * 3_600_000).toISOString();
    const token = generateToken();
    const record = {
        token,
        kind,
        createdBy: actor.userId,
        createdByName: actor.displayName,
        createdAt: createdAt.toISOString(),
        expiresAt,
        revoked: false,
    };
    if (kind === 'bucket') {
        const bucketId = requiredText(input.bucketId, 'Bucket ID', 160);
        record.bucketId = bucketId;
        record.bucketTitle = await assertBucketOwner(bucketId, actor.userId);
        record.role = shareRoleOrDefault(input.role);
    }
    else if (kind === 'group') {
        const groupId = requiredText(input.groupId, 'Group ID', 160);
        record.groupId = groupId;
        record.groupName = await assertGroupOwner(groupId, actor.userId);
    }
    await inviteLinkReference(token).set(record);
    return { token, expiresAt };
});
/** What the redemption screen shows before the viewer commits to anything. */
export const previewInviteLinkV1100 = onCall({ region: REGION }, async (request) => {
    const actor = authUser(request.auth);
    const link = await readUsableLink(dataOf(request.data).token);
    return {
        kind: link.kind,
        createdByName: link.createdByName,
        expiresAt: link.expiresAt,
        bucketTitle: link.bucketTitle ?? null,
        groupName: link.groupName ?? null,
        role: link.role ?? null,
        isOwnLink: link.createdBy === actor.userId,
    };
});
const redeemBucket = async (link, actor) => {
    const bucketId = link.bucketId;
    const memberReference = db()
        .collection('buckets')
        .doc(bucketId)
        .collection('members')
        .doc(actor.userId);
    const [memberSnapshot, membersSnapshot] = await Promise.all([
        memberReference.get(),
        db().collection('buckets').doc(bucketId).collection('members').get(),
    ]);
    if (memberSnapshot.exists && memberSnapshot.data().status === 'active') {
        return { kind: 'bucket', bucketId, alreadyGranted: true };
    }
    const activeCount = membersSnapshot.docs.filter((document) => document.data().status === 'active').length;
    if (activeCount >= inviteLinkLimits.maxBucketMembers) {
        throw new HttpsError('resource-exhausted', `A bucket supports up to ${inviteLinkLimits.maxBucketMembers} members.`);
    }
    const timestamp = new Date().toISOString();
    const role = link.role ?? 'contributor';
    const batch = db().batch();
    batch.set(memberReference, {
        userId: actor.userId,
        displayName: actor.displayName,
        role,
        status: 'active',
        invitedBy: link.createdBy,
        joinedAt: timestamp,
        updatedAt: timestamp,
    });
    batch.set(userSubcollection(actor.userId, 'bucketMemberships').doc(bucketId), {
        bucketId,
        role,
        bucketTitle: link.bucketTitle ?? 'A bucket',
        ownerName: link.createdByName,
        joinedAt: timestamp,
    });
    await batch.commit();
    return { kind: 'bucket', bucketId, alreadyGranted: false };
};
const redeemFriend = async (link, actor) => {
    const creatorId = link.createdBy;
    if (creatorId === actor.userId) {
        throw new HttpsError('failed-precondition', 'You cannot use your own friend link.');
    }
    const existing = await userSubcollection(actor.userId, 'friends').doc(creatorId).get();
    if (existing.exists) {
        return { kind: 'friend', friendUserId: creatorId, alreadyGranted: true };
    }
    const creatorProfile = await db().collection('publicProfiles').doc(creatorId).get();
    const creator = creatorProfile.exists
        ? creatorProfile.data()
        : {};
    const timestamp = new Date().toISOString();
    const batch = db().batch();
    // Sharing the link is the creator's consent, so the friendship is mutual
    // immediately; only the person opening it has to agree.
    batch.set(userSubcollection(actor.userId, 'friends').doc(creatorId), {
        userId: creatorId,
        displayName: typeof creator.displayName === 'string' ? creator.displayName : link.createdByName,
        email: typeof creator.email === 'string' ? creator.email : '',
        since: timestamp,
    });
    batch.set(userSubcollection(creatorId, 'friends').doc(actor.userId), {
        userId: actor.userId,
        displayName: actor.displayName,
        email: actor.email,
        since: timestamp,
    });
    await batch.commit();
    return { kind: 'friend', friendUserId: creatorId, alreadyGranted: false };
};
const redeemGroup = async (link, actor) => {
    const groupId = link.groupId;
    const groupReference = db().collection('friendGroups').doc(groupId);
    const groupSnapshot = await groupReference.get();
    if (!groupSnapshot.exists)
        throw new HttpsError('not-found', 'Group was not found.');
    const memberReference = groupReference.collection('members').doc(actor.userId);
    const memberSnapshot = await memberReference.get();
    if (memberSnapshot.exists && memberSnapshot.data().status === 'active') {
        return { kind: 'group', groupId, alreadyGranted: true };
    }
    const group = groupSnapshot.data();
    const timestamp = new Date().toISOString();
    const batch = db().batch();
    batch.set(memberReference, {
        userId: actor.userId,
        displayName: actor.displayName,
        email: actor.email,
        status: 'active',
        invitedBy: link.createdBy,
        invitedAt: timestamp,
        respondedAt: timestamp,
    });
    batch.set(userSubcollection(actor.userId, 'groupMemberships').doc(groupId), {
        groupId,
        groupName: group.name ?? link.groupName ?? 'A group',
        ownerId: group.ownerId ?? link.createdBy,
        status: 'active',
        updatedAt: timestamp,
    });
    batch.set(groupReference, { updatedAt: timestamp }, { merge: true });
    await batch.commit();
    return { kind: 'group', groupId, alreadyGranted: false };
};
/**
 * Redeems a link. Idempotent: someone who already has the access the link
 * grants gets a success telling them so, because a shared link is opened more
 * than once and a second tap must not read as a failure.
 */
export const redeemInviteLinkV1100 = onCall({ region: REGION }, async (request) => {
    const actor = authUser(request.auth);
    const link = await readUsableLink(dataOf(request.data).token);
    if (link.kind === 'bucket')
        return redeemBucket(link, actor);
    if (link.kind === 'group')
        return redeemGroup(link, actor);
    return redeemFriend(link, actor);
});
export const revokeInviteLinkV1100 = onCall({ region: REGION }, async (request) => {
    const actor = authUser(request.auth);
    const token = parseInviteLinkToken(dataOf(request.data).token);
    if (!token)
        throw new HttpsError('not-found', 'This invite link is not valid.');
    const reference = inviteLinkReference(token);
    const snapshot = await reference.get();
    if (!snapshot.exists)
        throw new HttpsError('not-found', 'This invite link is not valid.');
    if (snapshot.data().createdBy !== actor.userId) {
        throw new HttpsError('permission-denied', 'Only the creator can revoke this link.');
    }
    await reference.set({ revoked: true, revokedAt: new Date().toISOString() }, { merge: true });
    return { success: true };
});
/** The creator's own links, so the UI can list and revoke them. */
export const listInviteLinksV1100 = onCall({ region: REGION }, async (request) => {
    const actor = authUser(request.auth);
    const snapshot = await db()
        .collection('inviteLinks')
        .where('createdBy', '==', actor.userId)
        .where('revoked', '==', false)
        .get();
    return {
        links: snapshot.docs
            .map((document) => document.data())
            .filter((link) => isInviteLinkUsable(link))
            .map((link) => ({
            token: link.token,
            kind: link.kind,
            expiresAt: link.expiresAt,
            bucketId: link.bucketId ?? null,
            bucketTitle: link.bucketTitle ?? null,
            groupId: link.groupId ?? null,
            groupName: link.groupName ?? null,
            role: link.role ?? null,
        })),
    };
});
