import { getFunctions, httpsCallable } from '@/packages/firebase';

import type { SessionInviteService } from '../contracts/session-invite-service.interfaces';
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
import { getFirebaseRuntime } from './firebase-runtime.gateway';

const REGION = 'europe-west1';

const callable = <Request, Response>(name: string) =>
  httpsCallable<Request, Response>(
    getFunctions(getFirebaseRuntime().app, REGION),
    name,
  );

export class FirestoreCallableSessionInviteService
  implements SessionInviteService
{
  async createInvite(
    _user: SessionUser,
    sessionId: string,
    maxUses?: number,
  ): Promise<CreateSessionInviteResult> {
    const result = await callable<
      { sessionId: string; maxUses?: number },
      CreateSessionInviteResult
    >('createSessionInviteV170')({
      sessionId,
      ...(maxUses === undefined ? {} : { maxUses }),
    });
    return result.data;
  }

  async listInvites(
    _user: SessionUser,
    sessionId: string,
  ): Promise<SessionInvite[]> {
    const result = await callable<{ sessionId: string }, SessionInvite[]>(
      'listSessionInvitesV170',
    )({ sessionId });
    return result.data;
  }

  async revokeInvite(
    _user: SessionUser,
    sessionId: string,
    inviteId: string,
  ): Promise<SessionInvite> {
    const result = await callable<
      { sessionId: string; inviteId: string },
      SessionInvite
    >('revokeSessionInviteV170')({ sessionId, inviteId });
    return result.data;
  }

  async previewInvite(
    shareCode: string,
  ): Promise<PublicSessionInvitePreview> {
    const result = await callable<
      { shareCode: string },
      PublicSessionInvitePreview
    >('previewSessionInviteV170')({ shareCode });
    return result.data;
  }

  async joinAsGuest(
    shareCode: string,
    displayName: string,
  ): Promise<GuestSessionCapability> {
    const result = await callable<
      { shareCode: string; displayName: string },
      GuestSessionCapability
    >('joinOrderSessionAsGuestV170')({ shareCode, displayName });
    return result.data;
  }

  async getGuestSessionView(
    capability: GuestSessionCapability,
  ): Promise<GuestSessionView> {
    const result = await callable<
      Pick<GuestSessionCapability, 'sessionId' | 'guestId' | 'guestSecret'>,
      GuestSessionView
    >('getGuestOrderSessionViewV170')({
      sessionId: capability.sessionId,
      guestId: capability.guestId,
      guestSecret: capability.guestSecret,
    });
    return result.data;
  }

  async updateGuestContribution(
    input: GuestContributionInput,
  ): Promise<GuestContributionResult> {
    const result = await callable<
      GuestContributionInput,
      GuestContributionResult
    >('updateGuestSessionContributionV170')(input);
    return result.data;
  }

  async updateGuestResponse(input: GuestResponseInput): Promise<GuestSessionView> {
    const result = await callable<GuestResponseInput, GuestSessionView>(
      'updateGuestSessionResponseV170',
    )(input);
    return result.data;
  }

  async linkGuestToAccount(
    _user: SessionUser,
    capability: GuestSessionCapability,
  ): Promise<GuestAccountLinkResult> {
    const result = await callable<
      Pick<GuestSessionCapability, 'sessionId' | 'guestId' | 'guestSecret'>,
      GuestAccountLinkResult
    >('linkGuestOrderSessionAccountV170')({
      sessionId: capability.sessionId,
      guestId: capability.guestId,
      guestSecret: capability.guestSecret,
    });
    return result.data;
  }
}
