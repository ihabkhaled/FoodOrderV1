import { createBucket, updateBucket, upgradeLegacyBucket } from '@/lib/bucket';
import { nowIso } from '@/lib/date';
import { createId } from '@/lib/id';
import { createOrder, transitionOrder } from '@/lib/order';
import {
  applyContributionMutation,
  assertAssignableRole,
  buildGroupOrderLines,
  buildJoinCode,
  computeAggregate,
  detectAggregateDrift,
  generateInviteToken,
  hashInviteToken,
  inviteExpiryIso,
  inviteExpiryMillis,
  isActiveMember,
  isInviteUsable,
  MAX_BUCKET_MEMBERS,
  memberCan,
  omitKey,
  parseJoinCode,
  toOrderParticipants,
} from '@/lib/sharing';
import type {
  AuthService,
  DataService,
  SharedBucketView,
  SharingService,
  UserDataExport,
} from '@/services/contracts';
import type {
  Bucket,
  BucketActivityEvent,
  BucketActivityType,
  BucketContribution,
  BucketDraft,
  BucketInvite,
  BucketMember,
  BucketRole,
  ContributionMutationRecord,
  ContributionOperation,
  DashboardSummary,
  Order,
  OrderDraft,
  OrderStatus,
  ProfileDefaults,
  SessionUser,
  UserProfile,
} from '@/types/domain';

interface SharingTables {
  members: Record<string, BucketMember[]>;
  invites: Record<string, BucketInvite[]>;
  contributions: Record<string, BucketContribution[]>;
  mutations: Record<string, ContributionMutationRecord[]>;
  activity: Record<string, BucketActivityEvent[]>;
}

interface LocalDatabase {
  users: Record<string, { password: string; profile: UserProfile }>;
  buckets: Record<string, Bucket[]>;
  orders: Record<string, Order[]>;
  sharing: SharingTables;
}

const DB_KEY = 'foodorder:v1:database';
const SESSION_KEY = 'foodorder:v1:session';
const AUTH_EVENT = 'foodorder:auth-change';
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

const readDatabase = (): LocalDatabase => {
  // Stored JSON may predate the sharing schema, so treat every table as optional.
  let raw: Partial<LocalDatabase>;
  try {
    raw = JSON.parse(localStorage.getItem(DB_KEY) ?? '') as Partial<LocalDatabase>;
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

const writeDatabase = (database: LocalDatabase): void => {
  localStorage.setItem(DB_KEY, JSON.stringify(database));
};

const toSessionUser = (profile: UserProfile): SessionUser => ({
  id: profile.id,
  email: profile.email,
  displayName: profile.fullName,
  isDemo: true,
});

const notifyAuth = (): void => {
  window.dispatchEvent(new Event(AUTH_EVENT));
};

const findBucketEntry = (
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

const memberOf = (
  database: LocalDatabase,
  bucketId: string,
  userId: string,
): BucketMember | null =>
  (database.sharing.members[bucketId] ?? []).find((member) => member.userId === userId) ?? null;

const storeBucket = (
  database: LocalDatabase,
  entry: { ownerId: string; index: number },
  bucket: Bucket,
): void => {
  const owned = database.buckets[entry.ownerId] ?? [];
  owned[entry.index] = bucket;
  database.buckets[entry.ownerId] = owned;
};

const roleOf = (database: LocalDatabase, bucket: Bucket, userId: string): BucketRole | null => {
  if (bucket.ownerId === userId) return 'owner';
  const member = memberOf(database, bucket.id, userId);
  return isActiveMember(member) ? member.role : null;
};

const appendActivity = (
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

const seedOwnerMember = (database: LocalDatabase, bucket: Bucket): void => {
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

export class LocalAuthService implements AuthService {
  subscribe(listener: (user: SessionUser | null) => void): () => void {
    const emit = (): void => {
      const id = localStorage.getItem(SESSION_KEY);
      const user = id ? readDatabase().users[id] : undefined;
      listener(user ? toSessionUser(user.profile) : null);
    };
    emit();
    window.addEventListener(AUTH_EVENT, emit);
    return () => { window.removeEventListener(AUTH_EVENT, emit); };
  }

  async login(email: string, password: string): Promise<SessionUser> {
    const database = readDatabase();
    const record = Object.values(database.users).find(
      (item) => item.profile.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!record || record.password !== password) throw new Error('Invalid email or password.');
    localStorage.setItem(SESSION_KEY, record.profile.id);
    notifyAuth();
    return toSessionUser(record.profile);
  }

  async register(
    fullName: string,
    email: string,
    password: string,
    defaults: ProfileDefaults,
  ): Promise<SessionUser> {
    const database = readDatabase();
    if (Object.values(database.users).some((item) => item.profile.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account already exists for this email.');
    }
    const id = createId('user');
    const createdAt = nowIso();
    const profile: UserProfile = {
      id,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      locale: defaults.locale,
      theme: defaults.theme,
      defaultCurrency: defaults.defaultCurrency,
      createdAt,
      updatedAt: createdAt,
    };
    database.users[id] = { password, profile };
    database.buckets[id] = [];
    database.orders[id] = [];
    writeDatabase(database);
    localStorage.setItem(SESSION_KEY, id);
    notifyAuth();
    return toSessionUser(profile);
  }

  async resetPassword(email: string): Promise<void> {
    const exists = Object.values(readDatabase().users).some(
      (item) => item.profile.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!exists) throw new Error('No local account exists for this email.');
    throw new Error('Password reset email requires Firebase mode. In local mode, create another account.');
  }

  async logout(): Promise<void> {
    localStorage.removeItem(SESSION_KEY);
    notifyAuth();
  }

  async deleteAccount(_user: SessionUser): Promise<void> {
    // Local credentials live in the user record removed by deleteAllUserData.
    localStorage.removeItem(SESSION_KEY);
    notifyAuth();
  }
}

export class LocalDataService implements DataService {
  async getProfile(user: SessionUser, _defaults: ProfileDefaults): Promise<UserProfile> {
    // Local profiles are always seeded at registration; defaults only apply there.
    const record = readDatabase().users[user.id];
    if (!record) throw new Error('User profile was not found.');
    return structuredClone(record.profile);
  }

  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    const database = readDatabase();
    const existing = database.users[profile.id];
    if (!existing) throw new Error('User profile was not found.');
    const saved = { ...profile, updatedAt: nowIso() };
    database.users[profile.id] = { ...existing, profile: saved };
    writeDatabase(database);
    return structuredClone(saved);
  }

  async listBuckets(user: SessionUser): Promise<Bucket[]> {
    return structuredClone(readDatabase().buckets[user.id] ?? []).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  async getBucket(user: SessionUser, bucketId: string): Promise<Bucket | null> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) return null;
    return roleOf(database, entry.bucket, user.id) ? structuredClone(entry.bucket) : null;
  }

  async createBucket(user: SessionUser, draft: BucketDraft): Promise<Bucket> {
    const database = readDatabase();
    const bucket = createBucket({ id: user.id, displayName: user.displayName }, draft);
    database.buckets[user.id] = [bucket, ...(database.buckets[user.id] ?? [])];
    writeDatabase(database);
    return structuredClone(bucket);
  }

  async updateBucket(user: SessionUser, bucketId: string, draft: BucketDraft): Promise<Bucket> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) throw new Error('Bucket was not found.');
    const role = roleOf(database, entry.bucket, user.id);
    if (!role || !['owner', 'editor'].includes(role)) throw new Error('You do not have permission for this action.');
    const saved = updateBucket(entry.bucket, draft);
    storeBucket(database, entry, saved);
    if (saved.visibility === 'shared') {
      appendActivity(database, bucketId, user, 'bucket_updated', 'bucket', bucketId, {
        title: saved.title,
      });
    }
    writeDatabase(database);
    return structuredClone(saved);
  }

  async deleteBucket(user: SessionUser, bucketId: string): Promise<void> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) return;
    if (entry.bucket.ownerId !== user.id) throw new Error('You do not have permission for this action.');
    database.buckets[entry.ownerId] = (database.buckets[entry.ownerId] ?? []).filter(
      (bucket) => bucket.id !== bucketId,
    );
    database.sharing = {
      members: omitKey(database.sharing.members, bucketId),
      invites: omitKey(database.sharing.invites, bucketId),
      contributions: omitKey(database.sharing.contributions, bucketId),
      mutations: omitKey(database.sharing.mutations, bucketId),
      activity: omitKey(database.sharing.activity, bucketId),
    };
    writeDatabase(database);
  }

  async listOrders(userId: string): Promise<Order[]> {
    return structuredClone(readDatabase().orders[userId] ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getOrder(userId: string, orderId: string): Promise<Order | null> {
    const found = (readDatabase().orders[userId] ?? []).find((order) => order.id === orderId);
    return found ? structuredClone(found) : null;
  }

  async createOrder(userId: string, draft: OrderDraft): Promise<Order> {
    const database = readDatabase();
    const order = createOrder(userId, draft);
    database.orders[userId] = [order, ...(database.orders[userId] ?? [])];
    writeDatabase(database);
    return structuredClone(order);
  }

  async updateOrderStatus(userId: string, orderId: string, status: OrderStatus): Promise<Order> {
    const database = readDatabase();
    const orders = database.orders[userId] ?? [];
    const index = orders.findIndex((order) => order.id === orderId);
    const existing = orders[index];
    if (index === -1 || !existing) throw new Error('Order was not found.');
    const saved = transitionOrder(existing, status);
    orders[index] = saved;
    database.orders[userId] = orders;
    writeDatabase(database);
    return structuredClone(saved);
  }

  async deleteOrder(userId: string, orderId: string): Promise<void> {
    const database = readDatabase();
    database.orders[userId] = (database.orders[userId] ?? []).filter((order) => order.id !== orderId);
    writeDatabase(database);
  }

  async getDashboard(user: SessionUser): Promise<DashboardSummary> {
    const database = readDatabase();
    const buckets = database.buckets[user.id] ?? [];
    const orders = database.orders[user.id] ?? [];
    const shared = Object.values(database.buckets)
      .flat()
      .filter(
        (bucket) =>
          bucket.ownerId !== user.id && isActiveMember(memberOf(database, bucket.id, user.id)),
      );
    return {
      bucketCount: buckets.length,
      sharedBucketCount: shared.length,
      activeItemCount: buckets.reduce((count, bucket) => count + bucket.items.filter((item) => item.active).length, 0),
      orderCount: orders.length,
      placedOrderCount: orders.filter((order) => order.status === 'placed').length,
      completedOrderCount: orders.filter((order) => order.status === 'completed').length,
      recentOrders: structuredClone(orders.slice(0, 5)),
    };
  }

  async exportUserData(user: SessionUser, defaults: ProfileDefaults): Promise<UserDataExport> {
    const database = readDatabase();
    const profile = await this.getProfile(user, defaults);
    const memberships = Object.values(database.buckets)
      .flat()
      .filter((bucket) => bucket.ownerId !== user.id)
      .map((bucket) => ({ bucket, member: memberOf(database, bucket.id, user.id) }))
      .filter(({ member }) => isActiveMember(member))
      .map(({ bucket, member }) => ({
        bucketId: bucket.id,
        bucketTitle: bucket.title,
        role: member?.role ?? 'viewer',
      }));
    return structuredClone({
      exportedAt: nowIso(),
      profile,
      buckets: database.buckets[user.id] ?? [],
      orders: database.orders[user.id] ?? [],
      memberships,
    });
  }

  async deleteAllUserData(user: SessionUser): Promise<void> {
    const database = readDatabase();
    for (const bucket of database.buckets[user.id] ?? []) {
      database.sharing = {
        members: omitKey(database.sharing.members, bucket.id),
        invites: omitKey(database.sharing.invites, bucket.id),
        contributions: omitKey(database.sharing.contributions, bucket.id),
        mutations: omitKey(database.sharing.mutations, bucket.id),
        activity: omitKey(database.sharing.activity, bucket.id),
      };
    }
    // Memberships in other people's buckets become 'left'; contributions stay in totals.
    for (const members of Object.values(database.sharing.members)) {
      for (const member of members) {
        if (member.userId === user.id && member.status === 'active') {
          member.status = 'left';
          member.updatedAt = nowIso();
        }
      }
    }
    database.buckets = omitKey(database.buckets, user.id);
    database.orders = omitKey(database.orders, user.id);
    database.users = omitKey(database.users, user.id);
    writeDatabase(database);
  }
}

export class LocalSharingService implements SharingService {
  async listSharedWithMe(user: SessionUser): Promise<Bucket[]> {
    const database = readDatabase();
    return structuredClone(
      Object.values(database.buckets)
        .flat()
        .filter(
          (bucket) =>
            bucket.ownerId !== user.id && isActiveMember(memberOf(database, bucket.id, user.id)),
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    );
  }

  async getSharedBucketView(user: SessionUser, bucketId: string): Promise<SharedBucketView | null> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) return null;
    const myRole = roleOf(database, entry.bucket, user.id);
    if (!myRole) return null;
    return structuredClone({
      bucket: entry.bucket,
      members: (database.sharing.members[bucketId] ?? []).filter(
        (member) => member.status === 'active',
      ),
      contributions: database.sharing.contributions[bucketId] ?? [],
      myRole,
    });
  }

  async enableSharing(user: SessionUser, bucketId: string): Promise<Bucket> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) throw new Error('Bucket was not found.');
    if (entry.bucket.ownerId !== user.id) throw new Error('You do not have permission for this action.');
    if (entry.bucket.visibility === 'shared') return structuredClone(entry.bucket);
    const shared: Bucket = {
      ...entry.bucket,
      visibility: 'shared',
      revision: entry.bucket.revision + 1,
      updatedAt: nowIso(),
    };
    storeBucket(database, entry, shared);
    seedOwnerMember(database, shared);
    appendActivity(database, bucketId, user, 'bucket_shared', 'bucket', bucketId, {
      title: shared.title,
    });
    writeDatabase(database);
    return structuredClone(shared);
  }

  async createInvite(
    user: SessionUser,
    bucketId: string,
    role: Exclude<BucketRole, 'owner'>,
  ): Promise<{ invite: BucketInvite; joinCode: string }> {
    assertAssignableRole(role);
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) throw new Error('Bucket was not found.');
    if (entry.bucket.ownerId !== user.id) throw new Error('You do not have permission for this action.');
    if (entry.bucket.visibility !== 'shared') throw new Error('Enable sharing before inviting members.');
    const token = generateInviteToken();
    const tokenHash = await hashInviteToken(token);
    const createdAt = nowIso();
    const invite: BucketInvite = {
      id: tokenHash,
      bucketId,
      bucketTitle: entry.bucket.title,
      ownerName: entry.bucket.ownerName,
      role,
      status: 'pending',
      createdBy: user.id,
      createdAt,
      expiresAt: inviteExpiryIso(createdAt),
      expiresAtMillis: inviteExpiryMillis(createdAt),
      acceptedBy: null,
      acceptedAt: null,
      revokedAt: null,
    };
    database.sharing.invites[bucketId] = [invite, ...(database.sharing.invites[bucketId] ?? [])];
    appendActivity(database, bucketId, user, 'invite_created', 'invite', invite.id, { role });
    writeDatabase(database);
    return { invite: structuredClone(invite), joinCode: buildJoinCode(bucketId, token) };
  }

  async listInvites(user: SessionUser, bucketId: string): Promise<BucketInvite[]> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry || entry.bucket.ownerId !== user.id) throw new Error('You do not have permission for this action.');
    return structuredClone(database.sharing.invites[bucketId] ?? []);
  }

  async revokeInvite(user: SessionUser, bucketId: string, inviteId: string): Promise<void> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry || entry.bucket.ownerId !== user.id) throw new Error('You do not have permission for this action.');
    const invites = database.sharing.invites[bucketId] ?? [];
    const invite = invites.find((item) => item.id === inviteId);
    if (!invite || invite.status !== 'pending') return;
    invite.status = 'revoked';
    invite.revokedAt = nowIso();
    appendActivity(database, bucketId, user, 'invite_revoked', 'invite', inviteId, {});
    writeDatabase(database);
  }

  async previewJoinCode(code: string): Promise<BucketInvite> {
    const parsed = parseJoinCode(code);
    if (!parsed) throw new Error('This join code is not valid.');
    const database = readDatabase();
    const tokenHash = await hashInviteToken(parsed.token);
    const invite = (database.sharing.invites[parsed.bucketId] ?? []).find(
      (item) => item.id === tokenHash,
    );
    if (!invite) throw new Error('This join code is not valid.');
    if (!isInviteUsable(invite)) throw new Error('This invite has expired or was already used.');
    return structuredClone(invite);
  }

  async acceptJoinCode(user: SessionUser, code: string): Promise<Bucket> {
    const parsed = parseJoinCode(code);
    if (!parsed) throw new Error('This join code is not valid.');
    const database = readDatabase();
    const tokenHash = await hashInviteToken(parsed.token);
    const invite = (database.sharing.invites[parsed.bucketId] ?? []).find(
      (item) => item.id === tokenHash,
    );
    if (!invite) throw new Error('This join code is not valid.');
    if (!isInviteUsable(invite)) throw new Error('This invite has expired or was already used.');
    const entry = findBucketEntry(database, parsed.bucketId);
    if (!entry || entry.bucket.visibility !== 'shared') throw new Error('This join code is not valid.');
    if (entry.bucket.ownerId === user.id) throw new Error('You are already a member of this bucket.');
    const members = database.sharing.members[parsed.bucketId] ?? [];
    const existing = members.find((member) => member.userId === user.id);
    if (existing && existing.status === 'active') throw new Error('You are already a member of this bucket.');
    const activeCount = members.filter((member) => member.status === 'active').length;
    if (activeCount >= MAX_BUCKET_MEMBERS) throw new Error(`A bucket supports up to ${MAX_BUCKET_MEMBERS} members.`);
    const at = nowIso();
    if (existing) {
      existing.status = 'active';
      existing.role = invite.role;
      existing.invitedBy = invite.createdBy;
      existing.updatedAt = at;
    } else {
      members.push({
        userId: user.id,
        displayName: user.displayName,
        email: user.email,
        role: invite.role,
        status: 'active',
        invitedBy: invite.createdBy,
        joinedAt: at,
        updatedAt: at,
      });
    }
    database.sharing.members[parsed.bucketId] = members;
    invite.status = 'accepted';
    invite.acceptedBy = user.id;
    invite.acceptedAt = at;
    appendActivity(database, parsed.bucketId, user, 'member_joined', 'member', user.id, {
      role: invite.role,
    });
    writeDatabase(database);
    return structuredClone(entry.bucket);
  }

  async changeMemberRole(
    user: SessionUser,
    bucketId: string,
    memberId: string,
    role: Exclude<BucketRole, 'owner'>,
  ): Promise<BucketMember> {
    assertAssignableRole(role);
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry || entry.bucket.ownerId !== user.id) throw new Error('You do not have permission for this action.');
    if (memberId === entry.bucket.ownerId) throw new Error('Ownership cannot be assigned through invites or role changes.');
    const member = memberOf(database, bucketId, memberId);
    if (!isActiveMember(member)) throw new Error('Member was not found.');
    member.role = role;
    member.updatedAt = nowIso();
    appendActivity(database, bucketId, user, 'member_role_changed', 'member', memberId, {
      role,
      memberName: member.displayName,
    });
    writeDatabase(database);
    return structuredClone(member);
  }

  async revokeMember(user: SessionUser, bucketId: string, memberId: string): Promise<void> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry || entry.bucket.ownerId !== user.id) throw new Error('You do not have permission for this action.');
    if (memberId === entry.bucket.ownerId) throw new Error('The owner cannot be removed. Delete the bucket instead.');
    const member = memberOf(database, bucketId, memberId);
    if (!isActiveMember(member)) return;
    member.status = 'revoked';
    member.updatedAt = nowIso();
    // Product rule: contributions are retained in totals for order history accuracy.
    appendActivity(database, bucketId, user, 'member_revoked', 'member', memberId, {
      memberName: member.displayName,
    });
    writeDatabase(database);
  }

  async leaveBucket(user: SessionUser, bucketId: string): Promise<void> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) return;
    if (entry.bucket.ownerId === user.id) throw new Error('The owner cannot leave. Delete the bucket instead.');
    const member = memberOf(database, bucketId, user.id);
    if (!isActiveMember(member)) return;
    member.status = 'left';
    member.updatedAt = nowIso();
    appendActivity(database, bucketId, user, 'member_left', 'member', user.id, {});
    writeDatabase(database);
  }

  async setContribution(
    user: SessionUser,
    bucketId: string,
    itemId: string,
    operation: ContributionOperation,
    value: number,
    mutationId: string,
  ): Promise<ContributionMutationRecord> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) throw new Error('Bucket was not found.');
    const isOwner = entry.bucket.ownerId === user.id;
    const member = memberOf(database, bucketId, user.id);
    if (!isOwner && !memberCan(member, 'contribute')) throw new Error('You do not have permission for this action.');
    const item = entry.bucket.items.find((candidate) => candidate.id === itemId);
    if (!item?.active) throw new Error('This item is not available.');
    const contributions = database.sharing.contributions[bucketId] ?? [];
    const mutations = database.sharing.mutations[bucketId] ?? [];
    const result = applyContributionMutation(
      {
        bucketRevision: entry.bucket.revision,
        aggregate: entry.bucket.aggregate,
        contribution: contributions.find((candidate) => candidate.userId === user.id) ?? null,
        appliedMutation: mutations.find((candidate) => candidate.id === mutationId) ?? null,
      },
      {
        mutationId,
        bucketId,
        itemId,
        userId: user.id,
        displayName: user.displayName,
        operation,
        value,
        occurredAt: nowIso(),
      },
    );
    if (!result.alreadyApplied) {
      const nextContributions = contributions.filter((candidate) => candidate.userId !== user.id);
      nextContributions.push(result.contribution);
      database.sharing.contributions[bucketId] = nextContributions;
      database.sharing.mutations[bucketId] = [result.record, ...mutations].slice(0, 500);
      storeBucket(database, entry, {
        ...entry.bucket,
        aggregate: result.aggregate,
        revision: result.bucketRevision,
        updatedAt: nowIso(),
      });
      appendActivity(database, bucketId, user, 'contribution_updated', 'item', itemId, {
        itemName: item.name,
        quantity: String(result.record.resultQuantity),
      });
      writeDatabase(database);
    }
    return structuredClone(result.record);
  }

  async listActivity(user: SessionUser, bucketId: string): Promise<BucketActivityEvent[]> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry || !roleOf(database, entry.bucket, user.id)) throw new Error('You do not have permission for this action.');
    return structuredClone(database.sharing.activity[bucketId] ?? []);
  }

  async repairAggregate(
    user: SessionUser,
    bucketId: string,
  ): Promise<{ bucket: Bucket; drifted: boolean }> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry || entry.bucket.ownerId !== user.id) throw new Error('You do not have permission for this action.');
    const contributions = database.sharing.contributions[bucketId] ?? [];
    const { drifted } = detectAggregateDrift(entry.bucket.aggregate, contributions);
    if (!drifted) return { bucket: structuredClone(entry.bucket), drifted: false };
    const repaired: Bucket = {
      ...entry.bucket,
      aggregate: computeAggregate(contributions),
      revision: entry.bucket.revision + 1,
      updatedAt: nowIso(),
    };
    storeBucket(database, entry, repaired);
    appendActivity(database, bucketId, user, 'aggregate_repaired', 'bucket', bucketId, {});
    writeDatabase(database);
    return { bucket: structuredClone(repaired), drifted: true };
  }

  async placeGroupOrder(user: SessionUser, bucketId: string, notes: string): Promise<Order> {
    const database = readDatabase();
    const entry = findBucketEntry(database, bucketId);
    if (!entry) throw new Error('Bucket was not found.');
    const role = roleOf(database, entry.bucket, user.id);
    if (!role || !['owner', 'editor'].includes(role)) throw new Error('You do not have permission for this action.');
    const lines = buildGroupOrderLines(entry.bucket);
    if (lines.length === 0) throw new Error('Choose at least one item.');
    const contributions = database.sharing.contributions[bucketId] ?? [];
    const order = createOrder(user.id, {
      bucketId,
      bucketTitle: entry.bucket.title,
      currency: entry.bucket.currency,
      lines,
      notes,
      status: 'placed',
      sourceBucketRevision: entry.bucket.revision,
      participants: toOrderParticipants(contributions),
    });
    database.orders[user.id] = [order, ...(database.orders[user.id] ?? [])];
    appendActivity(database, bucketId, user, 'order_placed', 'order', order.id, {
      total: String(order.total),
      currency: order.currency,
    });
    writeDatabase(database);
    return structuredClone(order);
  }
}
