import { describe, expect, it } from 'vitest';

import {
  consumeSessionInvite,
  createGuestCapability,
  createSessionInvite,
  isSessionInviteUsable,
  linkGuestCapability,
  parseSessionShareCode,
  revokeSessionInvite,
  validatePublicSessionInvitePreview,
  verifyGuestCapability,
} from '@/modules/data-access/helpers/session-invite.helper';

const createdAt = '2026-07-18T08:00:00.000Z';

describe('session invitation domain', () => {
  it('stores only a token hash and returns a parseable share code', async () => {
    const created = await createSessionInvite({
      sessionId: 'session-1',
      createdBy: 'owner-1',
      createdAt,
      maxUses: 2,
    });
    const parsed = parseSessionShareCode(created.shareCode);

    expect(parsed).not.toBeNull();
    expect(parsed?.sessionId).toBe('session-1');
    expect(parsed?.rawToken).toMatch(/^[a-f0-9]{36}$/u);
    expect(created.invite.id).not.toBe(parsed?.rawToken);
    expect(created.invite).not.toHaveProperty('token');
    expect(created.invite).toMatchObject({
      status: 'pending',
      maxUses: 2,
      usedCount: 0,
      createdAt,
    });
  });

  it('rejects malformed share codes', () => {
    expect(parseSessionShareCode('')).toBeNull();
    expect(parseSessionShareCode('.token')).toBeNull();
    expect(parseSessionShareCode('session.')).toBeNull();
    expect(parseSessionShareCode('session.not-hex')).toBeNull();
  });

  it('consumes bounded uses and rejects exhaustion, expiry, and revocation', async () => {
    const { invite } = await createSessionInvite({
      sessionId: 'session-1',
      createdBy: 'owner-1',
      createdAt,
      maxUses: 2,
    });
    const once = consumeSessionInvite(invite, '2026-07-18T09:00:00.000Z');
    const exhausted = consumeSessionInvite(once, '2026-07-18T09:05:00.000Z');
    const revoked = revokeSessionInvite(invite, '2026-07-18T09:10:00.000Z');

    expect(once).toMatchObject({ usedCount: 1, status: 'pending' });
    expect(exhausted).toMatchObject({ usedCount: 2, status: 'exhausted' });
    expect(isSessionInviteUsable(exhausted)).toBe(false);
    expect(isSessionInviteUsable(revoked)).toBe(false);
    expect(() => consumeSessionInvite(exhausted)).toThrow(/no longer available/);
    expect(
      isSessionInviteUsable(invite, '2026-07-22T09:00:00.000Z'),
    ).toBe(false);
    expect(revokeSessionInvite(revoked)).toBe(revoked);
  });

  it('validates invitation input and maximum uses', async () => {
    await expect(
      createSessionInvite({ sessionId: '', createdBy: 'owner-1', createdAt }),
    ).rejects.toThrow(/Session ID/);
    await expect(
      createSessionInvite({ sessionId: 'session-1', createdBy: '', createdAt }),
    ).rejects.toThrow(/creator/);
    await expect(
      createSessionInvite({
        sessionId: 'session-1',
        createdBy: 'owner-1',
        createdAt,
        maxUses: 0,
      }),
    ).rejects.toThrow(/between 1 and 100/);
  });
});

describe('guest capabilities', () => {
  it('returns a raw secret once and stores only its hash', async () => {
    const created = await createGuestCapability({
      sessionId: 'session-1',
      displayName: ' Guest User ',
      createdAt,
    });

    expect(created.publicCapability).toMatchObject({
      sessionId: 'session-1',
      displayName: 'Guest User',
    });
    expect(created.publicCapability.guestId).toMatch(/^guest_[a-f0-9]{36}$/u);
    expect(created.publicCapability.guestSecret).toMatch(/^[a-f0-9]{36}$/u);
    expect(created.storedCapability).not.toHaveProperty('guestSecret');
    expect(created.storedCapability.secretHash).not.toBe(
      created.publicCapability.guestSecret,
    );
    await expect(
      verifyGuestCapability(
        created.storedCapability,
        created.publicCapability.guestSecret,
        '2026-07-18T09:00:00.000Z',
      ),
    ).resolves.toBe(true);
    await expect(
      verifyGuestCapability(
        created.storedCapability,
        'wrong-secret',
        '2026-07-18T09:00:00.000Z',
      ),
    ).resolves.toBe(false);
  });

  it('denies expired, revoked, and linked capabilities', async () => {
    const created = await createGuestCapability({
      sessionId: 'session-1',
      displayName: 'Guest',
      createdAt,
    });
    await expect(
      verifyGuestCapability(
        created.storedCapability,
        created.publicCapability.guestSecret,
        '2026-08-20T00:00:00.000Z',
      ),
    ).resolves.toBe(false);
    await expect(
      verifyGuestCapability(
        { ...created.storedCapability, status: 'revoked' },
        created.publicCapability.guestSecret,
        createdAt,
      ),
    ).resolves.toBe(false);
    await expect(
      verifyGuestCapability(
        { ...created.storedCapability, status: 'linked' },
        created.publicCapability.guestSecret,
        createdAt,
      ),
    ).resolves.toBe(false);
  });

  it('links once to one authenticated account', async () => {
    const created = await createGuestCapability({
      sessionId: 'session-1',
      displayName: 'Guest',
      createdAt,
    });
    const linked = linkGuestCapability(
      created.storedCapability,
      'user-1',
      '2026-07-18T10:00:00.000Z',
    );

    expect(linked).toMatchObject({
      status: 'linked',
      linkedUserId: 'user-1',
      updatedAt: '2026-07-18T10:00:00.000Z',
    });
    expect(linkGuestCapability(linked, 'user-1')).toBe(linked);
    expect(() => linkGuestCapability(linked, 'user-2')).toThrow(/another account/);
    expect(() =>
      linkGuestCapability({ ...linked, status: 'revoked' }, 'user-1'),
    ).toThrow(/cannot be linked/);
  });
});

describe('public invitation projection', () => {
  it('accepts only complete bounded public data', () => {
    const preview = {
      sessionId: 'session-1',
      title: 'Breakfast',
      organizerDisplayName: 'Organizer',
      deadlineAt: null,
      currency: 'EGP' as const,
      activeItemCount: 12,
      participantCount: 4,
      isCollecting: true,
    };

    expect(validatePublicSessionInvitePreview(preview)).toEqual(preview);
    expect(validatePublicSessionInvitePreview(preview)).not.toBe(preview);
    expect(() =>
      validatePublicSessionInvitePreview({ ...preview, title: '' }),
    ).toThrow(/incomplete/);
    expect(() =>
      validatePublicSessionInvitePreview({ ...preview, activeItemCount: -1 }),
    ).toThrow(/counts/);
  });
});
