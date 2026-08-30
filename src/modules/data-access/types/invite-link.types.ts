import type { BucketRole } from './domain.types';

/** What a shareable link grants when redeemed. */
export type InviteLinkKind = 'bucket' | 'friend' | 'group';

export type InviteLinkRole = Exclude<BucketRole, 'owner'>;

/**
 * A shareable invite link. Stored under `inviteLinks/{token}`; the document id
 * is the token itself, so redemption is a single point read and a leaked link
 * cannot be enumerated from a resource id.
 */
export interface InviteLink {
  token: string;
  kind: InviteLinkKind;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  /** Present when `kind` is `bucket`. */
  bucketId?: string;
  bucketTitle?: string;
  role?: InviteLinkRole;
  /** Present when `kind` is `group`. */
  groupId?: string;
  groupName?: string;
}

/** What the redemption screen shows before the viewer confirms. */
export interface InviteLinkPreview {
  kind: InviteLinkKind;
  createdByName: string;
  expiresAt: string;
  bucketTitle?: string;
  groupName?: string;
  role?: InviteLinkRole;
  /** True when the viewer already has what the link grants. */
  alreadyGranted: boolean;
}

export interface InviteLinkRedemption {
  kind: InviteLinkKind;
  bucketId?: string;
  groupId?: string;
  friendUserId?: string;
  alreadyGranted: boolean;
}

export interface CreateInviteLinkInput {
  kind: InviteLinkKind;
  bucketId?: string;
  groupId?: string;
  role?: InviteLinkRole;
}

export interface CreatedInviteLink {
  token: string;
  url: string;
  expiresAt: string;
}
