/**
 * Pure invite-link rules, shared by the callables and their tests.
 *
 * Kept free of firebase-admin so the decisions that gate access — is this token
 * well formed, is this link still usable — can be tested without an emulator.
 */
export type InviteLinkKind = 'bucket' | 'friend' | 'group';
export type InviteLinkShareRole = 'editor' | 'contributor' | 'viewer';

export interface InviteLinkRecord {
  token: string;
  kind: InviteLinkKind;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  bucketId?: string;
  bucketTitle?: string;
  role?: InviteLinkShareRole;
  groupId?: string;
  groupName?: string;
}

export const INVITE_LINK_EXPIRY_HOURS: Record<InviteLinkKind, number> = {
  bucket: 168,
  friend: 24,
  group: 24,
};

export const inviteLinkLimits = {
  /** Caps how many live links one person can hold per kind. */
  perUserPerKind: 5,
  maxBucketMembers: 20,
} as const;

const TOKEN_CHARACTERS = /^[a-f0-9]+$/u;
const TOKEN_MIN_LENGTH = 32;
const TOKEN_MAX_LENGTH = 64;

/**
 * Returns the token only when it matches the generated shape. Anything else is
 * rejected before it can be used as a document id. Length is checked first so a
 * long hostile string never reaches the pattern.
 */
export const parseInviteLinkToken = (value: unknown): string | null => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (candidate.length < TOKEN_MIN_LENGTH || candidate.length > TOKEN_MAX_LENGTH) return null;
  return TOKEN_CHARACTERS.test(candidate) ? candidate : null;
};

export const isInviteLinkUsable = (
  link: Pick<InviteLinkRecord, 'revoked' | 'expiresAt'>,
  atIso: string = new Date().toISOString(),
): boolean => !link.revoked && link.expiresAt > atIso;

const SHARE_ROLES: Set<InviteLinkShareRole> = new Set(['editor', 'contributor', 'viewer']);

/** Owner is never assignable through a link. */
export const shareRoleOrDefault = (value: unknown): InviteLinkShareRole =>
  SHARE_ROLES.has(value as InviteLinkShareRole)
    ? (value as InviteLinkShareRole)
    : 'contributor';

export const INVITE_LINK_KINDS: InviteLinkKind[] = ['bucket', 'friend', 'group'];

/** Narrows unknown client input to a supported kind. */
export const isInviteLinkKind = (value: unknown): value is InviteLinkKind =>
  INVITE_LINK_KINDS.includes(value as InviteLinkKind);
