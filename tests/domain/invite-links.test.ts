import { describe, expect, it } from 'vitest';

import {
  buildInviteLinkPath,
  buildInviteLinkUrl,
  generateInviteLinkToken,
  INVITE_LINK_EXPIRY_HOURS,
  inviteLinkExpiresAt,
  isInviteLinkUsable,
  parseInviteLinkToken,
} from '@/modules/data-access/helpers/invite-link.helper';

describe('invite link tokens', () => {
  it('generates URL-safe tokens with at least 128 bits of entropy', () => {
    const token = generateInviteLinkToken();
    expect(token).toMatch(/^[a-f0-9]{32,}$/u);
    expect(generateInviteLinkToken()).not.toEqual(token);
  });

  it('accepts its own tokens and rejects malformed ones', () => {
    expect(parseInviteLinkToken(generateInviteLinkToken())).not.toBeNull();
    // A token is the whole secret, so anything that is not the exact shape is
    // rejected before it ever reaches a lookup.
    for (const invalid of ['', ' '.repeat(3), 'abc', '../../etc/passwd', 'z'.repeat(32), `${'a'.repeat(32)}/x`]) {
      expect(parseInviteLinkToken(invalid)).toBeNull();
    }
  });

  it('trims surrounding whitespace pasted from a chat app', () => {
    const token = generateInviteLinkToken();
    expect(parseInviteLinkToken(`  ${token}\n`)).toEqual(token);
  });
});

describe('invite link expiry', () => {
  it('expires buckets after seven days and friend or group links after one', () => {
    expect(INVITE_LINK_EXPIRY_HOURS.bucket).toBe(168);
    expect(INVITE_LINK_EXPIRY_HOURS.friend).toBe(24);
    expect(INVITE_LINK_EXPIRY_HOURS.group).toBe(24);
  });

  it('computes expiry from the creation instant', () => {
    const createdAt = '2026-08-26T10:00:00.000Z';
    expect(inviteLinkExpiresAt('friend', createdAt)).toBe('2026-08-27T10:00:00.000Z');
    expect(inviteLinkExpiresAt('bucket', createdAt)).toBe('2026-09-02T10:00:00.000Z');
  });

  it('stays usable until it expires, then stops', () => {
    const link = { revoked: false, expiresAt: '2026-08-27T10:00:00.000Z' };
    expect(isInviteLinkUsable(link, '2026-08-26T10:00:00.000Z')).toBe(true);
    expect(isInviteLinkUsable(link, '2026-08-27T09:59:59.000Z')).toBe(true);
    expect(isInviteLinkUsable(link, '2026-08-27T10:00:01.000Z')).toBe(false);
  });

  it('treats a revoked link as unusable even before expiry', () => {
    // Revocation is the owner's kill switch; it must win over a valid clock.
    expect(
      isInviteLinkUsable(
        { revoked: true, expiresAt: '2026-08-27T10:00:00.000Z' },
        '2026-08-26T10:00:00.000Z',
      ),
    ).toBe(false);
  });
});

describe('invite link URLs', () => {
  it('builds an app path a router can match', () => {
    expect(buildInviteLinkPath('abc123')).toBe('/join/abc123');
  });

  it('builds an absolute URL for sharing', () => {
    expect(buildInviteLinkUrl('https://example.app', 'abc123')).toBe(
      'https://example.app/join/abc123',
    );
    // A configured origin with a trailing slash must not double the separator.
    expect(buildInviteLinkUrl('https://example.app/', 'abc123')).toBe(
      'https://example.app/join/abc123',
    );
  });
});
