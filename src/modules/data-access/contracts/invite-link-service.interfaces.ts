import type {
  CreatedInviteLink,
  CreateInviteLinkInput,
  InviteLink,
  InviteLinkPreview,
  InviteLinkRedemption,
} from '../types/invite-link.types';

/**
 * Shareable invite links for buckets, friendships, and groups.
 *
 * Redemption is idempotent: a link pasted into a group chat is opened more than
 * once, and a second tap must report success, not an error.
 */
export interface InviteLinkService {
  createLink(input: CreateInviteLinkInput): Promise<CreatedInviteLink>;
  previewLink(token: string): Promise<InviteLinkPreview>;
  redeemLink(token: string): Promise<InviteLinkRedemption>;
  revokeLink(token: string): Promise<void>;
  listLinks(): Promise<InviteLink[]>;
}
