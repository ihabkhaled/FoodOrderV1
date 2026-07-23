import { nowIso } from '@/shared/helpers';

import type {
  Bucket,
  BucketContribution,
  BucketInvite,
  BucketMember,
  BucketRole,
  ContributionMutationRecord,
  ContributionOperation,
  SharedOrderParticipant,
} from '../types/domain.types';
import { MAX_ORDER_QUANTITY } from './bucket.helper';

export const MAX_BUCKET_MEMBERS = 20;
export const MAX_CONTRIBUTION_QUANTITY = MAX_ORDER_QUANTITY;
export const INVITE_EXPIRY_HOURS = 72;
export const JOIN_CODE_SEPARATOR = '.';

/** Central role permission matrix. Firestore Security Rules mirror this table. */
const PERMISSIONS = {
  owner: { view: true, contribute: true, editBucket: true, manageMembers: true, placeGroupOrder: true, deleteBucket: true },
  editor: { view: true, contribute: true, editBucket: true, manageMembers: false, placeGroupOrder: true, deleteBucket: false },
  contributor: { view: true, contribute: true, editBucket: false, manageMembers: false, placeGroupOrder: false, deleteBucket: false },
  viewer: { view: true, contribute: false, editBucket: false, manageMembers: false, placeGroupOrder: false, deleteBucket: false },
} as const satisfies Record<BucketRole, Record<string, boolean>>;

export type SharingPermission = keyof (typeof PERMISSIONS)['owner'];

export const roleAllows = (role: BucketRole, permission: SharingPermission): boolean =>
  PERMISSIONS[role][permission];

export const ASSIGNABLE_ROLES: Exclude<BucketRole, 'owner'>[] = ['editor', 'contributor', 'viewer'];

export const isActiveMember = (member: BucketMember | null | undefined): member is BucketMember =>
  Boolean(member && member.status === 'active');

export const memberCan = (
  member: BucketMember | null | undefined,
  permission: SharingPermission,
): boolean => isActiveMember(member) && roleAllows(member.role, permission);

/** Cryptographically random, URL-safe invite token. */
export const generateInviteToken = (): string => {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

/** SHA-256 hex digest — invites store only the hash, never the raw token. */
export const hashInviteToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const buildJoinCode = (bucketId: string, token: string): string =>
  `${bucketId}${JOIN_CODE_SEPARATOR}${token}`;

export const parseJoinCode = (code: string): { bucketId: string; token: string } | null => {
  const trimmed = code.trim();
  const separator = trimmed.lastIndexOf(JOIN_CODE_SEPARATOR);
  if (separator <= 0 || separator === trimmed.length - 1) return null;
  const bucketId = trimmed.slice(0, separator);
  const token = trimmed.slice(separator + 1);
  if (!/^[a-f0-9]{24,}$/i.test(token)) return null;
  return { bucketId, token };
};

export const inviteExpiryMillis = (from: string): number =>
  new Date(from).getTime() + INVITE_EXPIRY_HOURS * 3_600_000;

export const inviteExpiryIso = (from: string): string =>
  new Date(inviteExpiryMillis(from)).toISOString();

export const isInviteUsable = (invite: BucketInvite, atIso: string = nowIso()): boolean =>
  invite.status === 'pending' && invite.expiresAt > atIso;

export const validateQuantity = (value: number): void => {
  if (!Number.isInteger(value) || value < 0 || value > MAX_CONTRIBUTION_QUANTITY) {
    throw new Error(`Quantity must be a whole number between 0 and ${MAX_CONTRIBUTION_QUANTITY}.`);
  }
};

/** Immutable removal of a computed key (lint-safe alternative to `delete`). */
export const omitKey = <T>(record: Record<string, T>, key: string): Record<string, T> => {
  const { [key]: _omitted, ...rest } = record;
  return rest;
};

/** Authoritative aggregate derived from every contribution; repair source of truth. */
export const computeAggregate = (
  contributions: Pick<BucketContribution, 'quantities'>[],
): Record<string, number> => {
  const aggregate: Record<string, number> = {};
  for (const contribution of contributions) {
    for (const [itemId, quantity] of Object.entries(contribution.quantities)) {
      if (quantity > 0) aggregate[itemId] = (aggregate[itemId] ?? 0) + quantity;
    }
  }
  return aggregate;
};

export const detectAggregateDrift = (
  materialized: Record<string, number>,
  contributions: Pick<BucketContribution, 'quantities'>[],
): { drifted: boolean; expected: Record<string, number> } => {
  const expected = computeAggregate(contributions);
  const keys = new Set([...Object.keys(expected), ...Object.keys(materialized)]);
  for (const key of keys) {
    if ((expected[key] ?? 0) !== (materialized[key] ?? 0)) return { drifted: true, expected };
  }
  return { drifted: false, expected };
};

export interface ContributionMutationInput {
  mutationId: string;
  bucketId: string;
  itemId: string;
  userId: string;
  displayName: string;
  operation: ContributionOperation;
  value: number;
  occurredAt: string;
}

export interface ContributionMutationResult {
  contribution: BucketContribution;
  aggregate: Record<string, number>;
  bucketRevision: number;
  record: ContributionMutationRecord;
  alreadyApplied: boolean;
}

/**
 * Pure idempotent contribution engine used by every persistence adapter.
 * `set` stores an absolute per-user quantity; `increment` applies a delta.
 * A replayed mutation id returns the recorded result without re-applying,
 * so an offline retry can never double-increment the aggregate.
 */
export const applyContributionMutation = (
  state: {
    bucketRevision: number;
    aggregate: Record<string, number>;
    contribution: BucketContribution | null;
    appliedMutation: ContributionMutationRecord | null;
  },
  input: ContributionMutationInput,
): ContributionMutationResult => {
  if (state.appliedMutation) {
    if (!state.contribution) throw new Error('Mutation record exists without a contribution.');
    return {
      contribution: state.contribution,
      aggregate: state.aggregate,
      bucketRevision: state.bucketRevision,
      record: state.appliedMutation,
      alreadyApplied: true,
    };
  }
  const current = state.contribution?.quantities[input.itemId] ?? 0;
  const target = input.operation === 'set' ? input.value : current + input.value;
  if (input.operation === 'increment' && !Number.isInteger(input.value)) {
    throw new Error('Increment deltas must be whole numbers.');
  }
  validateQuantity(target);
  const delta = target - current;
  const base = state.contribution?.quantities ?? {};
  const quantities =
    target === 0 ? omitKey(base, input.itemId) : { ...base, [input.itemId]: target };
  const revision = (state.contribution?.revision ?? 0) + 1;
  const contribution: BucketContribution = {
    bucketId: input.bucketId,
    userId: input.userId,
    displayName: input.displayName,
    quantities,
    revision,
    lastMutationId: input.mutationId,
    updatedAt: input.occurredAt,
  };
  const nextAggregate = (state.aggregate[input.itemId] ?? 0) + delta;
  const aggregate =
    nextAggregate <= 0
      ? omitKey(state.aggregate, input.itemId)
      : { ...state.aggregate, [input.itemId]: nextAggregate };
  const bucketRevision = state.bucketRevision + 1;
  const record: ContributionMutationRecord = {
    id: input.mutationId,
    bucketId: input.bucketId,
    itemId: input.itemId,
    userId: input.userId,
    operation: input.operation,
    requestedValue: input.value,
    appliedDelta: delta,
    resultQuantity: target,
    resultRevision: bucketRevision,
    createdAt: input.occurredAt,
  };
  return { contribution, aggregate, bucketRevision, record, alreadyApplied: false };
};

export const toOrderParticipants = (
  contributions: BucketContribution[],
): SharedOrderParticipant[] =>
  contributions
    .filter((contribution) => Object.keys(contribution.quantities).length > 0)
    .map((contribution) => ({
      userId: contribution.userId,
      displayName: contribution.displayName,
      quantities: { ...contribution.quantities },
    }))
    .toSorted((a, b) => a.displayName.localeCompare(b.displayName));

/** Group order lines snapshot the aggregate against current item pricing. */
export const buildGroupOrderLines = (
  bucket: Bucket,
): { id: string; bucketItemId: string; name: string; quantity: number; unitPrice: number }[] =>
  bucket.items
    .filter((item) => item.active && (bucket.aggregate[item.id] ?? 0) > 0)
    .map((item) => ({
      id: item.id,
      bucketItemId: item.id,
      name: item.name,
      quantity: bucket.aggregate[item.id] ?? 0,
      unitPrice: item.unitPrice,
    }));

export const assertAssignableRole = (role: BucketRole): Exclude<BucketRole, 'owner'> => {
  if (role === 'owner') throw new Error('Ownership cannot be assigned through invites or role changes.');
  return role;
};
