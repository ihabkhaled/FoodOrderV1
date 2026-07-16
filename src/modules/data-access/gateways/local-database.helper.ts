import { dispatchAppEvent } from '@/platform/browser';
import { readWebStorage, writeWebStorage } from '@/platform/storage';
import { createId, nowIso } from '@/shared/helpers';

import { upgradeLegacyBucket } from '../helpers/bucket.helper';
import { isActiveMember } from '../helpers/sharing.helper';
import type {
  Bucket,
  BucketActivityEvent,
  BucketActivityType,
  BucketContribution,
  BucketInvite,
  BucketMember,
  BucketRole,
  ContributionMutationRecord,
  Order,
  SessionUser,
  UserProfile,
} from '../types/domain.types';

interface SharingTables {
  members: Record<string, BucketMember[]>;
  invites: Record<string, BucketInvite[]>;
  contributions: Record<string, BucketContribution[]>;
  mutations: Record<string, ContributionMutationRecord[]>;
  activity: Record<string, BucketActivityEvent[]>;
}

export interface LocalDatabase {
  users: Record<string, { password: string; profile: UserProfile }>;
  buckets: Record<string, Bucket[]>;
  orders: Record<string, Order[]>;
  sharing: SharingTables;
}

const DB_KEY = 'foodorder:v1:database';
export const SESSION_KEY = 'foodorder:v1:session';
export const AUTH_EVENT = 'foodorder:auth-change';
const ACTIVITY_LIMIT = 100;

const emptySharing = (): SharingTables => ({
  members: {},
  invites: {},
  contributions: {},
  mutations: {},
  activity: {},
});

const defaultDatabase = (): LocalDatabase => ({
  users: {},
  buckets: {},
  orders: {},
  sharing: emptySharing(),
});

export const readDatabase = (): LocalDatabase => {
  // Stored JSON may predate the sharing schema, so treat every table as optional.
  let raw: Partial<LocalDatabase>;
  try {
    raw = JSON.parse(readWebStorage(DB_KEY) ?? '') as Partial<LocalDatabase>;
  } catch {
    return defaultDatabase();
  }
  const parsed: LocalDatabase = {
    users: raw.users ?? {},
    buckets: raw.buckets ?? {},
    orders: raw.orders ?? {},
    sharing: { ...emptySharing(), ...raw.sharing },
  };
  for (const [ownerId, buckets] of Object.entries(parsed.buckets)) {
    const owner = parsed.users[ownerId];
    parsed.buckets[ownerId] = buckets.map((bucket) =>
      (bucket as Partial<Bucket>).schemaVersion === 2
        ? bucket
        : upgradeLegacyBucket(bucket as unknown as Record<string, unknown>, {
            id: ownerId,
            displayName: owner?.profile.fullName ?? 'Owner',
          }),
    );
  }
  return parsed;
};

export const writeDatabase = (database: LocalDatabase): void => {
  writeWebStorage(DB_KEY, JSON.stringify(database));
};

export const toSessionUser = (profile: UserProfile): SessionUser => ({
  id: profile.id,
  email: profile.email,
  displayName: profile.fullName,
  isDemo: true,
});

export const notifyAuth = (): void => {
  dispatchAppEvent(AUTH_EVENT);
};

export const findBucketEntry = (
  database: LocalDatabase,
  bucketId: string,
): { ownerId: string; index: number; bucket: Bucket } | null => {
  for (const [ownerId, buckets] of Object.entries(database.buckets)) {
    const index = buckets.findIndex((bucket) => bucket.id === bucketId);
    const bucket = index === -1 ? undefined : buckets[index];
    if (bucket) return { ownerId, index, bucket };
  }
  return null;
};

export const memberOf = (
  database: LocalDatabase,
  bucketId: string,
  userId: string,
): BucketMember | null =>
  (database.sharing.members[bucketId] ?? []).find((member) => member.userId === userId) ?? null;

export const storeBucket = (
  database: LocalDatabase,
  entry: { ownerId: string; index: number },
  bucket: Bucket,
): void => {
  const owned = database.buckets[entry.ownerId] ?? [];
  owned[entry.index] = bucket;
  database.buckets[entry.ownerId] = owned;
};

export const roleOf = (database: LocalDatabase, bucket: Bucket, userId: string): BucketRole | null => {
  if (bucket.ownerId === userId) return 'owner';
  const member = memberOf(database, bucket.id, userId);
  return isActiveMember(member) ? member.role : null;
};

export const appendActivity = (
  database: LocalDatabase,
  bucketId: string,
  actor: SessionUser,
  type: BucketActivityType,
  targetType: BucketActivityEvent['targetType'],
  targetId: string,
  metadata: Record<string, string> = {},
): void => {
  const events = database.sharing.activity[bucketId] ?? [];
  events.unshift({
    id: createId('event'),
    bucketId,
    type,
    actorId: actor.id,
    actorName: actor.displayName,
    targetType,
    targetId,
    metadata,
    createdAt: nowIso(),
  });
  database.sharing.activity[bucketId] = events.slice(0, ACTIVITY_LIMIT);
};

export const seedOwnerMember = (database: LocalDatabase, bucket: Bucket): void => {
  const members = database.sharing.members[bucket.id] ?? [];
  if (!members.some((member) => member.userId === bucket.ownerId)) {
    const owner = database.users[bucket.ownerId];
    const at = nowIso();
    members.push({
      userId: bucket.ownerId,
      displayName: owner?.profile.fullName ?? bucket.ownerName,
      email: owner?.profile.email ?? '',
      role: 'owner',
      status: 'active',
      invitedBy: bucket.ownerId,
      joinedAt: at,
      updatedAt: at,
    });
    database.sharing.members[bucket.id] = members;
  }
};
