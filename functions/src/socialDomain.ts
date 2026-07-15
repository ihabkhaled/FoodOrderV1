export type ShareRole = 'editor' | 'contributor' | 'viewer';
export type GroupMembershipStatus =
  | 'pending'
  | 'active'
  | 'declined'
  | 'removed'
  | 'left';

const ROLE_PRIORITY: Record<ShareRole, number> = {
  viewer: 1,
  contributor: 2,
  editor: 3,
};

export const normalizeEmail = (value: unknown): string => {
  if (typeof value !== 'string') throw new Error('Email must be a string.');
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/u.test(normalized)) {
    throw new Error('Enter a valid email address.');
  }
  return normalized;
};

export const requiredText = (
  value: unknown,
  label: string,
  maxLength: number,
): string => {
  if (typeof value !== 'string') throw new Error(`${label} must be a string.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new Error(`${label} must contain between 1 and ${maxLength} characters.`);
  }
  return normalized;
};

export const optionalText = (value: unknown, maxLength: number): string =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

export const shareRole = (value: unknown): ShareRole => {
  if (value === 'editor' || value === 'contributor' || value === 'viewer') {
    return value;
  }
  throw new Error('A valid sharing role is required.');
};

export const strongestRole = (
  current: unknown,
  requested: ShareRole,
): ShareRole => {
  const normalized =
    current === 'editor' || current === 'contributor' || current === 'viewer'
      ? current
      : 'viewer';
  return ROLE_PRIORITY[normalized] >= ROLE_PRIORITY[requested]
    ? normalized
    : requested;
};

export const strongestRoleFromGrants = (roles: unknown[]): ShareRole | null => {
  const validRoles = roles.filter(
    (role): role is ShareRole =>
      role === 'editor' || role === 'contributor' || role === 'viewer',
  );
  const firstRole = validRoles[0];
  if (!firstRole) return null;
  return validRoles
    .slice(1)
    .reduce((current, role) => strongestRole(current, role), firstRole);
};

export const mergeAccessSources = (
  current: unknown,
  sourceId: string,
): string[] => {
  const existing = Array.isArray(current)
    ? current.filter((value): value is string => typeof value === 'string')
    : [];
  return [...new Set([...existing, sourceId])].sort((left, right) =>
    left.localeCompare(right),
  );
};

export const removeAccessSource = (
  current: unknown,
  sourceId: string,
): string[] => {
  const existing = Array.isArray(current)
    ? current.filter((value): value is string => typeof value === 'string')
    : [];
  return [...new Set(existing.filter((value) => value !== sourceId))].sort(
    (left, right) => left.localeCompare(right),
  );
};

export const canInviteGroupMember = (status: unknown): boolean =>
  status !== 'active' && status !== 'pending';

export const friendRequestId = (senderId: string, recipientId: string): string =>
  `${senderId}_${recipientId}`;
