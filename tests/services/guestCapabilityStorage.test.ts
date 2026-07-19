import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  readGuestSessionCapability,
  removeGuestSessionCapability,
  writeGuestSessionCapability,
} from '../../src/modules/session-invites/helpers/guest-capability-storage.helper';

const CAPABILITY = {
  sessionId: 'session-1',
  guestId: 'guest-1',
  guestSecret: 'secret-1',
  expiresAt: '2099-07-18T10:00:00.000Z',
  displayName: 'Guest One',
};

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe('guest capability storage', () => {
  it('stores and restores a valid scoped capability', () => {
    writeGuestSessionCapability(CAPABILITY);

    expect(readGuestSessionCapability(CAPABILITY.sessionId)).toEqual(CAPABILITY);
  });

  it('removes malformed and expired capabilities', () => {
    localStorage.setItem(
      'foodorder:v1:guest-session-capability:session-1',
      JSON.stringify({ sessionId: 'session-1' }),
    );
    expect(readGuestSessionCapability('session-1')).toBeNull();

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2100-01-01T00:00:00.000Z'));
    writeGuestSessionCapability(CAPABILITY);
    expect(readGuestSessionCapability('session-1')).toBeNull();
  });

  it('removes the capability without affecting other sessions', () => {
    writeGuestSessionCapability(CAPABILITY);
    writeGuestSessionCapability({
      ...CAPABILITY,
      sessionId: 'session-2',
      guestId: 'guest-2',
    });

    removeGuestSessionCapability('session-1');

    expect(readGuestSessionCapability('session-1')).toBeNull();
    expect(readGuestSessionCapability('session-2')?.guestId).toBe('guest-2');
  });
});
