import { nowIso } from '@/shared/helpers';

import type {
  GuestSessionCapability,
  PublicSessionInvitePreview,
  SessionInvite,
  StoredGuestSessionCapability,
} from '../types/session-invite.types';
import { generateInviteToken, hashInviteToken } from './sharing.helper';

export const SESSION_INVITE_EXPIRY_HOURS = 72;
export const GUEST_CAPABILITY_EXPIRY_HOURS = 24 * 30;
export const SESSION_SHARE_CODE_SEPARATOR = '.';
export const DEFAULT_SESSION_INVITE_MAX_USES = 20;

const assertRequiredText = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};

const expiryIso = (from: string, hours: number): string => {
  const fromMillis = Date.parse(from);
  if (Number.isNaN(fromMillis)) throw new Error('Expiry source must be a valid ISO timestamp.');
  return new Date(fromMillis + hours * 3_600_000).toISOString();
};

export const buildSessionShareCode = (
  sessionId: string,
  rawToken: string,
): string =>
  `${assertRequiredText(sessionId, 'Session ID')}${SESSION_SHARE_CODE_SEPARATOR}${assertRequiredText(rawToken, 'Invitation token')}`;

export const parseSessionShareCode = (
  shareCode: string,
): { sessionId: string; rawToken: string } | null => {
  const normalized = shareCode.trim();
  const separator = normalized.lastIndexOf(SESSION_SHARE_CODE_SEPARATOR);
  if (separator <= 0 || separator === normalized.length - 1) return null;
  const sessionId = normalized.slice(0, separator);
  const rawToken = normalized.slice(separator + 1);
  if (!/^[a-f0-9]{36}$/iu.test(rawToken)) return null;
  return { sessionId, rawToken };
};

export const createSessionInvite = async (input: {
  sessionId: string;
  createdBy: string;
  createdAt?: string;
  maxUses?: number;
}): Promise<{ invite: SessionInvite; shareCode: string }> => {
  const sessionId = assertRequiredText(input.sessionId, 'Session ID');
  const createdBy = assertRequiredText(input.createdBy, 'Invitation creator');
  const createdAt = input.createdAt ?? nowIso();
  const maxUses = input.maxUses ?? DEFAULT_SESSION_INVITE_MAX_USES;
  if (!Number.isSafeInteger(maxUses) || maxUses < 1 || maxUses > 100) {
    throw new Error('Invitation maximum uses must be between 1 and 100.');
  }
  const rawToken = generateInviteToken();
  const tokenHash = await hashInviteToken(rawToken);
  const expiresAt = expiryIso(createdAt, SESSION_INVITE_EXPIRY_HOURS);
  return {
    invite: {
      id: tokenHash,
      sessionId,
      status: 'pending',
      createdBy,
      expiresAt,
      expiresAtMillis: Date.parse(expiresAt),
      maxUses,
      usedCount: 0,
      createdAt,
      revokedAt: null,
    },
    shareCode: buildSessionShareCode(sessionId, rawToken),
  };
};

export const isSessionInviteUsable = (
  invite: SessionInvite,
  at: string = nowIso(),
): boolean =>
  invite.status === 'pending' &&
  invite.usedCount < invite.maxUses &&
  Date.parse(invite.expiresAt) > Date.parse(at);

export const consumeSessionInvite = (
  invite: SessionInvite,
  at: string = nowIso(),
): SessionInvite => {
  if (!isSessionInviteUsable(invite, at)) {
    throw new Error('This invitation is no longer available.');
  }
  const usedCount = invite.usedCount + 1;
  return {
    ...invite,
    usedCount,
    status: usedCount >= invite.maxUses ? 'exhausted' : 'pending',
  };
};

export const revokeSessionInvite = (
  invite: SessionInvite,
  at: string = nowIso(),
): SessionInvite => {
  if (invite.status === 'revoked') return invite;
  if (Number.isNaN(Date.parse(at))) throw new Error('Revocation time must be valid.');
  return { ...invite, status: 'revoked', revokedAt: at };
};

export const createGuestCapability = async (input: {
  sessionId: string;
  displayName: string;
  createdAt?: string;
}): Promise<{
  publicCapability: GuestSessionCapability;
  storedCapability: StoredGuestSessionCapability;
}> => {
  const sessionId = assertRequiredText(input.sessionId, 'Session ID');
  const displayName = assertRequiredText(input.displayName, 'Guest display name').slice(0, 120);
  const createdAt = input.createdAt ?? nowIso();
  const guestId = `guest_${generateInviteToken()}`;
  const guestSecret = generateInviteToken();
  const secretHash = await hashInviteToken(guestSecret);
  const expiresAt = expiryIso(createdAt, GUEST_CAPABILITY_EXPIRY_HOURS);
  return {
    publicCapability: {
      sessionId,
      guestId,
      guestSecret,
      expiresAt,
      displayName,
    },
    storedCapability: {
      sessionId,
      guestId,
      expiresAt,
      displayName,
      secretHash,
      status: 'active',
      linkedUserId: null,
      createdAt,
      updatedAt: createdAt,
    },
  };
};

export const verifyGuestCapability = async (
  stored: StoredGuestSessionCapability,
  rawSecret: string,
  at: string = nowIso(),
): Promise<boolean> => {
  if (stored.status !== 'active') return false;
  if (Date.parse(stored.expiresAt) <= Date.parse(at)) return false;
  return stored.secretHash === (await hashInviteToken(rawSecret));
};

export const linkGuestCapability = (
  stored: StoredGuestSessionCapability,
  userId: string,
  at: string = nowIso(),
): StoredGuestSessionCapability => {
  const normalizedUserId = assertRequiredText(userId, 'Authenticated user ID');
  if (stored.status === 'linked') {
    if (stored.linkedUserId !== normalizedUserId) {
      throw new Error('This guest contribution is linked to another account.');
    }
    return stored;
  }
  if (stored.status !== 'active') {
    throw new Error('This guest capability cannot be linked.');
  }
  if (Number.isNaN(Date.parse(at))) throw new Error('Link time must be valid.');
  return {
    ...stored,
    status: 'linked',
    linkedUserId: normalizedUserId,
    updatedAt: at,
  };
};

export const validatePublicSessionInvitePreview = (
  preview: PublicSessionInvitePreview,
): PublicSessionInvitePreview => {
  if (!preview.sessionId.trim() || !preview.title.trim()) {
    throw new Error('Public invitation preview is incomplete.');
  }
  if (
    !Number.isSafeInteger(preview.activeItemCount) ||
    preview.activeItemCount < 0 ||
    !Number.isSafeInteger(preview.participantCount) ||
    preview.participantCount < 0
  ) {
    throw new Error('Public invitation preview counts are invalid.');
  }
  return { ...preview };
};
