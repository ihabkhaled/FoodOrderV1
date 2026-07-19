import type { GuestSessionCapability } from '@/modules/data-access';
import {
  readWebStorage,
  removeWebStorage,
  writeWebStorage,
} from '@/platform/storage';

const GUEST_CAPABILITY_STORAGE_PREFIX =
  'foodorder:v1:guest-session-capability:';

const capabilityStorageKey = (sessionId: string): string =>
  `${GUEST_CAPABILITY_STORAGE_PREFIX}${sessionId.trim()}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isGuestCapability = (value: unknown): value is GuestSessionCapability => {
  if (!isRecord(value)) return false;
  const sessionId = value['sessionId'];
  const guestId = value['guestId'];
  const guestSecret = value['guestSecret'];
  const expiresAt = value['expiresAt'];
  const displayName = value['displayName'];

  return (
    typeof sessionId === 'string' &&
    sessionId.trim().length > 0 &&
    typeof guestId === 'string' &&
    guestId.trim().length > 0 &&
    typeof guestSecret === 'string' &&
    guestSecret.trim().length > 0 &&
    typeof expiresAt === 'string' &&
    !Number.isNaN(Date.parse(expiresAt)) &&
    typeof displayName === 'string' &&
    displayName.trim().length > 0
  );
};

export const readGuestSessionCapability = (
  sessionId: string,
): GuestSessionCapability | null => {
  const key = capabilityStorageKey(sessionId);
  try {
    const parsed: unknown = JSON.parse(readWebStorage(key) ?? 'null');
    if (!isGuestCapability(parsed)) {
      removeWebStorage(key);
      return null;
    }
    if (Date.parse(parsed.expiresAt) <= Date.now()) {
      removeWebStorage(key);
      return null;
    }
    return parsed;
  } catch {
    removeWebStorage(key);
    return null;
  }
};

export const writeGuestSessionCapability = (
  capability: GuestSessionCapability,
): void => {
  writeWebStorage(
    capabilityStorageKey(capability.sessionId),
    JSON.stringify(capability),
  );
};

export const removeGuestSessionCapability = (sessionId: string): void => {
  removeWebStorage(capabilityStorageKey(sessionId));
};
