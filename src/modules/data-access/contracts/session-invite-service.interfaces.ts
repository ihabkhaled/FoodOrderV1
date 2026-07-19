import type { SessionUser } from '../types/domain.types';
import type {
  CreateSessionInviteResult,
  GuestAccountLinkResult,
  GuestContributionInput,
  GuestContributionResult,
  GuestResponseInput,
  GuestSessionCapability,
  GuestSessionView,
  PublicSessionInvitePreview,
  SessionInvite,
} from '../types/session-invite.types';

export interface SessionInviteService {
  createInvite(
    user: SessionUser,
    sessionId: string,
    maxUses?: number,
  ): Promise<CreateSessionInviteResult>;
  listInvites(user: SessionUser, sessionId: string): Promise<SessionInvite[]>;
  revokeInvite(
    user: SessionUser,
    sessionId: string,
    inviteId: string,
  ): Promise<SessionInvite>;
  previewInvite(shareCode: string): Promise<PublicSessionInvitePreview>;
  joinAsGuest(
    shareCode: string,
    displayName: string,
  ): Promise<GuestSessionCapability>;
  getGuestSessionView(
    capability: GuestSessionCapability,
  ): Promise<GuestSessionView>;
  updateGuestContribution(
    input: GuestContributionInput,
  ): Promise<GuestContributionResult>;
  updateGuestResponse(input: GuestResponseInput): Promise<GuestSessionView>;
  linkGuestToAccount(
    user: SessionUser,
    capability: GuestSessionCapability,
  ): Promise<GuestAccountLinkResult>;
}
