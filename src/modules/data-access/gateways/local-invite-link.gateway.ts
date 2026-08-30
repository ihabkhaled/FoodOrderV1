import { getApplicationBaseUrl } from '@/platform/browser';
import { readWebStorage, writeWebStorage } from '@/platform/storage';
import { nowIso } from '@/shared/helpers';

import type { InviteLinkService } from '../contracts/invite-link-service.interfaces';
import {
  buildInviteLinkUrl,
  generateInviteLinkToken,
  inviteLinkExpiresAt,
  isInviteLinkUsable,
  parseInviteLinkToken,
} from '../helpers/invite-link.helper';
import type {
  CreatedInviteLink,
  CreateInviteLinkInput,
  InviteLink,
  InviteLinkPreview,
  InviteLinkRedemption,
} from '../types/invite-link.types';

const STORAGE_KEY = 'foodorder:invite-links';

/**
 * Local-device invite links.
 *
 * Local mode has a single account on a single device, so a redeemed link cannot
 * actually connect two people. It still stores, previews, expires, and revokes
 * links exactly like the cloud gateway so the interface behaves identically —
 * which is what the end-to-end suite exercises.
 */
export class LocalInviteLinkService implements InviteLinkService {
  private read(): InviteLink[] {
    try {
      const raw = readWebStorage(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as InviteLink[]) : [];
    } catch {
      return [];
    }
  }

  private write(links: InviteLink[]): void {
    writeWebStorage(STORAGE_KEY, JSON.stringify(links));
  }

  private find(token: string): InviteLink {
    const parsed = parseInviteLinkToken(token);
    const link = parsed ? this.read().find((item) => item.token === parsed) : undefined;
    if (!link) throw new Error('This invite link is not valid.');
    if (!isInviteLinkUsable(link)) {
      throw new Error('This invite link has expired or was revoked.');
    }
    return link;
  }

  createLink(input: CreateInviteLinkInput): Promise<CreatedInviteLink> {
    const createdAt = nowIso();
    const token = generateInviteLinkToken();
    const link: InviteLink = {
      token,
      kind: input.kind,
      createdBy: 'local-user',
      createdByName: 'You',
      createdAt,
      expiresAt: inviteLinkExpiresAt(input.kind, createdAt),
      revoked: false,
      ...(input.bucketId ? { bucketId: input.bucketId } : {}),
      ...(input.groupId ? { groupId: input.groupId } : {}),
      ...(input.kind === 'bucket' ? { role: input.role ?? 'contributor' } : {}),
    };
    this.write([...this.read(), link]);
    return Promise.resolve({
      token,
      expiresAt: link.expiresAt,
      url: buildInviteLinkUrl(getApplicationBaseUrl(), token),
    });
  }

  previewLink(token: string): Promise<InviteLinkPreview> {
    const link = this.find(token);
    return Promise.resolve({
      kind: link.kind,
      createdByName: link.createdByName,
      expiresAt: link.expiresAt,
      ...(link.bucketTitle ? { bucketTitle: link.bucketTitle } : {}),
      ...(link.groupName ? { groupName: link.groupName } : {}),
      ...(link.role ? { role: link.role } : {}),
      // On one device the creator is always the viewer, so the link is already
      // "granted" by definition; the screen says so instead of pretending.
      alreadyGranted: true,
    });
  }

  redeemLink(token: string): Promise<InviteLinkRedemption> {
    const link = this.find(token);
    return Promise.resolve({
      kind: link.kind,
      ...(link.bucketId ? { bucketId: link.bucketId } : {}),
      ...(link.groupId ? { groupId: link.groupId } : {}),
      alreadyGranted: true,
    });
  }

  revokeLink(token: string): Promise<void> {
    const parsed = parseInviteLinkToken(token);
    if (!parsed) throw new Error('This invite link is not valid.');
    this.write(
      this.read().map((link) => (link.token === parsed ? { ...link, revoked: true } : link)),
    );
    return Promise.resolve();
  }

  listLinks(): Promise<InviteLink[]> {
    return Promise.resolve(this.read().filter((link) => isInviteLinkUsable(link)));
  }
}
