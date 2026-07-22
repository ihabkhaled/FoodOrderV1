export type ShareRole = 'editor' | 'contributor' | 'viewer';
export type GroupMembershipStatus =
  | 'pending'
  | 'active'
  | 'declined'
  | 'removed'
  | 'left';
export type BucketInvitationStatus = 'pending' | 'accepted' | 'declined';
export type BucketInvitationResponse = 'accepted' | 'declined';
export type BucketInvitationResponseAction =
  | 'accept'
  | 'decline'
  | 'dismiss'
  | 'missing-bucket'
  | 'idempotent'
  | 'invalid';

export interface ExistingMemberAccess {
  status?: unknown;
  role?: unknown;
  canCreateCustomItems?: unknown;
  canSetCustomItemPrice?: unknown;
  accessSources?: unknown;
}

export interface MaterializedMemberAccess {
  role: ShareRole;
  canCreateCustomItems: boolean;
  canSetCustomItemPrice: boolean;
  accessSources: string[];
}

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

const SHARE_ROLE_VALUES: readonly unknown[] = [
  'editor',
  'contributor',
  'viewer',
] satisfies readonly ShareRole[];

export const isShareRole = (value: unknown): value is ShareRole =>
  SHARE_ROLE_VALUES.includes(value);

export const shareRole = (value: unknown): ShareRole => {
  if (isShareRole(value)) return value;
  throw new Error('A valid sharing role is required.');
};

export const strongestRole = (
  current: unknown,
  requested: ShareRole,
): ShareRole => {
  const normalized = isShareRole(current) ? current : 'viewer';
  return ROLE_PRIORITY[normalized] >= ROLE_PRIORITY[requested]
    ? normalized
    : requested;
};

export const strongestRoleFromGrants = (roles: unknown[]): ShareRole | null => {
  const validRoles = roles.filter((role): role is ShareRole => isShareRole(role));
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
  return [...new Set([...existing, sourceId])].toSorted((left, right) =>
    left.localeCompare(right),
  );
};

export const materializedMemberAccess = (
  current: ExistingMemberAccess | null,
  requested: ShareRole,
  sourceId: string,
): MaterializedMemberAccess => {
  const active = current?.status === 'active' ? current : null;
  const role = strongestRole(active?.role, requested);
  return {
    role,
    canCreateCustomItems:
      typeof active?.canCreateCustomItems === 'boolean'
        ? active.canCreateCustomItems
        : role === 'editor',
    canSetCustomItemPrice:
      typeof active?.canSetCustomItemPrice === 'boolean'
        ? active.canSetCustomItemPrice
        : role === 'editor',
    accessSources: mergeAccessSources(active?.accessSources, sourceId),
  };
};

export const removeAccessSource = (
  current: unknown,
  sourceId: string,
): string[] => {
  const existing = Array.isArray(current)
    ? current.filter((value): value is string => typeof value === 'string')
    : [];
  return [...new Set(existing.filter((value) => value !== sourceId))].toSorted(
    (left, right) => left.localeCompare(right),
  );
};

export const canInviteGroupMember = (status: unknown): boolean =>
  status !== 'active' && status !== 'pending';

export const friendRequestId = (senderId: string, recipientId: string): string =>
  `${senderId}_${recipientId}`;

export const bucketInvitationId = (
  bucketId: string,
  recipientId: string,
): string => `${bucketId}_${recipientId}`;

export const bucketInvitationTransition = (
  current: BucketInvitationStatus,
  response: BucketInvitationResponse,
): 'apply' | 'idempotent' | 'invalid' => {
  if (current === response) return 'idempotent';
  return current === 'pending' ? 'apply' : 'invalid';
};

export const bucketInvitationResponseAction = (
  current: BucketInvitationStatus,
  response: BucketInvitationResponse,
  bucketExists: boolean,
): BucketInvitationResponseAction => {
  const transition = bucketInvitationTransition(current, response);
  if (transition !== 'apply') return transition;
  if (response === 'declined') return bucketExists ? 'decline' : 'dismiss';
  return bucketExists ? 'accept' : 'missing-bucket';
};
