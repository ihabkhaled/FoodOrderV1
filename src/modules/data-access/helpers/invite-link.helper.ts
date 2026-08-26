import { nowIso } from '@/shared/helpers';

import type { InviteLinkKind } from '../types/invite-link.types';

/**
 * Shareable invite links.
 *
 * Unlike a bucket join code, the token here is the entire secret: it carries no
 * resource id, so a leaked link reveals nothing until it is redeemed, and
 * redemption happens inside a callable that can check ownership and expiry. The
 * link is multi-use on purpose — one link is pasted into a group chat and used
 * by everyone in it — so it is bounded by expiry and revocation instead of by a
 * single acceptance.
 */
export const INVITE_LINK_EXPIRY_HOURS: Record<InviteLinkKind, number> = {
  bucket: 168,
  friend: 24,
  group: 24,
};

export const INVITE_LINK_ROUTE_SEGMENT = 'join';

const TOKEN_MIN_LENGTH = 32;
const TOKEN_MAX_LENGTH = 64;
const HEX_DIGITS = new Set('0123456789abcdef');

/** Character-wise rather than a pattern: linear, and obvious at a glance. */
const isLowercaseHex = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    if (!HEX_DIGITS.has(value.charAt(index))) return false;
  }
  return true;
};

/** Trailing separators trimmed without a pattern, so no input can backtrack. */
const withoutTrailingSlashes = (value: string): string => {
  let end = value.length;
  while (end > 0 && value.charAt(end - 1) === '/') end -= 1;
  return value.slice(0, end);
};

/** 128 bits of randomness, hex encoded. */
export const generateInviteLinkToken = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Returns the token only when it matches the exact generated shape, so a
 * malformed or hostile value never reaches a document lookup.
 */
export const parseInviteLinkToken = (value: string | null | undefined): string | null => {
  const candidate = (value ?? '').trim();
  // Length is checked before the pattern so a long hostile string is rejected
  // by a comparison rather than by scanning it.
  if (candidate.length < TOKEN_MIN_LENGTH || candidate.length > TOKEN_MAX_LENGTH) return null;
  return isLowercaseHex(candidate) ? candidate : null;
};

export const inviteLinkExpiresAt = (kind: InviteLinkKind, from: string = nowIso()): string =>
  new Date(new Date(from).getTime() + INVITE_LINK_EXPIRY_HOURS[kind] * 3_600_000).toISOString();

export const isInviteLinkUsable = (
  link: { revoked: boolean; expiresAt: string },
  atIso: string = nowIso(),
): boolean => !link.revoked && link.expiresAt > atIso;

export const buildInviteLinkPath = (token: string): string =>
  `/${INVITE_LINK_ROUTE_SEGMENT}/${token}`;

export const buildInviteLinkUrl = (origin: string, token: string): string =>
  `${withoutTrailingSlashes(origin)}${buildInviteLinkPath(token)}`;
