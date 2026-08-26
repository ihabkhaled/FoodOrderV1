import { getFunctions, httpsCallable } from '@/packages/firebase';
import { getCurrentOrigin } from '@/platform/browser';

import type { InviteLinkService } from '../contracts/invite-link-service.interfaces';
import { buildInviteLinkUrl } from '../helpers/invite-link.helper';
import type {
  CreatedInviteLink,
  CreateInviteLinkInput,
  InviteLink,
  InviteLinkPreview,
  InviteLinkRedemption,
} from '../types/invite-link.types';
import { getFirebaseRuntime } from './firebase-runtime.gateway';

const REGION = 'europe-west1';

const callable = <Request, Response>(name: string) =>
  httpsCallable<Request, Response>(getFunctions(getFirebaseRuntime().app, REGION), name);

/**
 * The absolute URL is assembled on the client so a link always points at the
 * origin the sharer is actually using — a preview deployment shares a preview
 * link rather than one that lands on production.
 */
const shareOrigin = (): string => getCurrentOrigin();

export class FirestoreCallableInviteLinkService implements InviteLinkService {
  async createLink(input: CreateInviteLinkInput): Promise<CreatedInviteLink> {
    const result = await callable<CreateInviteLinkInput, { token: string; expiresAt: string }>(
      'createInviteLinkV1100',
    )(input);
    return {
      token: result.data.token,
      expiresAt: result.data.expiresAt,
      url: buildInviteLinkUrl(shareOrigin(), result.data.token),
    };
  }

  async previewLink(token: string): Promise<InviteLinkPreview> {
    const result = await callable<
      { token: string },
      {
        kind: InviteLinkPreview['kind'];
        createdByName: string;
        expiresAt: string;
        bucketTitle: string | null;
        groupName: string | null;
        role: InviteLinkPreview['role'] | null;
        isOwnLink: boolean;
      }
    >('previewInviteLinkV1100')({ token });
    const data = result.data;
    return {
      kind: data.kind,
      createdByName: data.createdByName,
      expiresAt: data.expiresAt,
      ...(data.bucketTitle ? { bucketTitle: data.bucketTitle } : {}),
      ...(data.groupName ? { groupName: data.groupName } : {}),
      ...(data.role ? { role: data.role } : {}),
      alreadyGranted: false,
    };
  }

  async redeemLink(token: string): Promise<InviteLinkRedemption> {
    const result = await callable<{ token: string }, InviteLinkRedemption>(
      'redeemInviteLinkV1100',
    )({ token });
    return result.data;
  }

  async revokeLink(token: string): Promise<void> {
    await callable<{ token: string }, { success: boolean }>('revokeInviteLinkV1100')({ token });
  }

  async listLinks(): Promise<InviteLink[]> {
    const result = await callable<Record<string, never>, { links: InviteLink[] }>(
      'listInviteLinksV1100',
    )({});
    return result.data.links;
  }
}
