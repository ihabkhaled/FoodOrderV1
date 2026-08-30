export const INVITE_LINK_EXPIRY_HOURS = {
    bucket: 168,
    friend: 24,
    group: 24,
};
export const inviteLinkLimits = {
    /** Caps how many live links one person can hold per kind. */
    perUserPerKind: 5,
    maxBucketMembers: 20,
};
const TOKEN_CHARACTERS = /^[a-f0-9]+$/u;
const TOKEN_MIN_LENGTH = 32;
const TOKEN_MAX_LENGTH = 64;
/**
 * Returns the token only when it matches the generated shape. Anything else is
 * rejected before it can be used as a document id. Length is checked first so a
 * long hostile string never reaches the pattern.
 */
export const parseInviteLinkToken = (value) => {
    const candidate = typeof value === 'string' ? value.trim() : '';
    if (candidate.length < TOKEN_MIN_LENGTH || candidate.length > TOKEN_MAX_LENGTH)
        return null;
    return TOKEN_CHARACTERS.test(candidate) ? candidate : null;
};
export const isInviteLinkUsable = (link, atIso = new Date().toISOString()) => !link.revoked && link.expiresAt > atIso;
const SHARE_ROLES = new Set(['editor', 'contributor', 'viewer']);
/** Owner is never assignable through a link. */
export const shareRoleOrDefault = (value) => SHARE_ROLES.has(value)
    ? value
    : 'contributor';
export const INVITE_LINK_KINDS = ['bucket', 'friend', 'group'];
/** Narrows unknown client input to a supported kind. */
export const isInviteLinkKind = (value) => INVITE_LINK_KINDS.includes(value);
