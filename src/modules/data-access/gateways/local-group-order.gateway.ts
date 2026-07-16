import { nowIso } from '@/lib/date';
import { readWebStorage, writeWebStorage } from '@/platform/storage';

import type {
  CustomItemInput,
  MemberCustomItemPermissions,
} from '../contracts/group-order-service.interfaces';
import { validatePricingPolicy } from '../helpers/bucket.helper';
import {
  assertBucketMutable,
  beginOrdering,
  completeOrdering,
  freezeBucket,
  unfreezeBucket,
} from '../helpers/bucket-lifecycle.helper';
import { createOrder } from '../helpers/order.helper';
import {
  buildGroupOrderLines,
  toOrderParticipants,
} from '../helpers/sharing.helper';
import type {
  Bucket,
  BucketContribution,
  BucketItem,
  BucketMember,
  BucketPricingPolicy,
  ContributionMutationRecord,
  ContributionOperation,
  Order,
  SessionUser,
} from '../types/domain.types';
import {
  assertOwner,
  buildReceipt,
  canCreateCustomItem,
  normalizeBucket,
  normalizeCustomItem,
  participantOrder,
  priceToMinor,
} from './group-order-gateway.helper';
import { LocalSharingService } from './local-sharing.gateway';

const LOCAL_DATABASE_KEY = 'foodorder:v1:database';

interface LocalSharingTables {
  members: Record<string, BucketMember[]>;
  contributions: Record<string, BucketContribution[]>;
  [key: string]: unknown;
}

interface LocalGroupOrderDatabase {
  buckets: Record<string, Bucket[]>;
  orders: Record<string, Order[]>;
  sharing: LocalSharingTables;
  orderMutations?: Record<string, { orderId: string; ownerId: string }>;
  [key: string]: unknown;
}

const readLocalDatabase = (): LocalGroupOrderDatabase => {
  const raw = readWebStorage(LOCAL_DATABASE_KEY);
  if (!raw) throw new Error('The local database is not initialized.');

  return JSON.parse(raw) as LocalGroupOrderDatabase;
};

const writeLocalDatabase = (database: LocalGroupOrderDatabase): void => {
  writeWebStorage(LOCAL_DATABASE_KEY, JSON.stringify(database));
};

const findLocalBucket = (
  database: LocalGroupOrderDatabase,
  bucketId: string,
): { ownerId: string; bucket: Bucket; index: number } => {
  for (const [ownerId, buckets] of Object.entries(database.buckets)) {
    const index = buckets.findIndex((bucket) => bucket.id === bucketId);
    if (index !== -1) {
      const bucket = buckets[index];
      if (!bucket) break;
      return { ownerId, bucket: normalizeBucket(bucket), index };
    }
  }

  throw new Error('Bucket was not found.');
};

const saveLocalBucket = (
  database: LocalGroupOrderDatabase,
  ownerId: string,
  index: number,
  bucket: Bucket,
): void => {
  const buckets = [...(database.buckets[ownerId] ?? [])];
  buckets[index] = bucket;
  database.buckets[ownerId] = buckets;
};

const findActiveMember = (
  database: LocalGroupOrderDatabase,
  bucketId: string,
  userId: string,
): BucketMember | null =>
  database.sharing.members[bucketId]?.find(
    (member) => member.userId === userId && member.status === 'active',
  ) ?? null;

const addOrderToLocalUser = (
  database: LocalGroupOrderDatabase,
  userId: string,
  order: Order,
): void => {
  const orders = database.orders[userId] ?? [];
  if (!orders.some((candidate) => candidate.id === order.id)) {
    database.orders[userId] = [order, ...orders];
  }
};

export class LocalGroupOrderService extends LocalSharingService {
  freezeBucket(user: SessionUser, bucketId: string): Promise<Bucket> {
    const database = readLocalDatabase();
    const found = findLocalBucket(database, bucketId);
    assertOwner(found.bucket, user);
    const saved = freezeBucket(found.bucket, user.id);
    saveLocalBucket(database, found.ownerId, found.index, saved);
    writeLocalDatabase(database);
    return Promise.resolve(saved);
  }

  unfreezeBucket(user: SessionUser, bucketId: string): Promise<Bucket> {
    const database = readLocalDatabase();
    const found = findLocalBucket(database, bucketId);
    assertOwner(found.bucket, user);
    const saved = unfreezeBucket(found.bucket);
    saveLocalBucket(database, found.ownerId, found.index, saved);
    writeLocalDatabase(database);
    return Promise.resolve(saved);
  }

  updatePricingPolicy(
    user: SessionUser,
    bucketId: string,
    policy: BucketPricingPolicy,
  ): Promise<Bucket> {
    const database = readLocalDatabase();
    const found = findLocalBucket(database, bucketId);
    assertOwner(found.bucket, user);
    assertBucketMutable(found.bucket);
    const saved: Bucket = {
      ...found.bucket,
      pricingPolicy: validatePricingPolicy(policy),
      revision: found.bucket.revision + 1,
      updatedAt: nowIso(),
    };
    saveLocalBucket(database, found.ownerId, found.index, saved);
    writeLocalDatabase(database);
    return Promise.resolve(saved);
  }

  setMemberCustomItemPermissions(
    user: SessionUser,
    bucketId: string,
    memberId: string,
    permissions: MemberCustomItemPermissions,
  ): Promise<BucketMember> {
    const database = readLocalDatabase();
    const found = findLocalBucket(database, bucketId);
    assertOwner(found.bucket, user);
    const members = [...(database.sharing.members[bucketId] ?? [])];
    const index = members.findIndex((member) => member.userId === memberId);
    const member = members[index];
    if (!member || member.role === 'owner') {
      throw new Error('Member was not found.');
    }
    const saved = { ...member, ...permissions, updatedAt: nowIso() };
    members[index] = saved;
    database.sharing.members[bucketId] = members;
    writeLocalDatabase(database);
    return Promise.resolve(saved);
  }

  addCustomItem(
    user: SessionUser,
    bucketId: string,
    input: CustomItemInput,
  ): Promise<BucketItem> {
    const database = readLocalDatabase();
    const found = findLocalBucket(database, bucketId);
    assertBucketMutable(found.bucket);
    const permission = canCreateCustomItem(
      found.bucket,
      user,
      findActiveMember(database, bucketId, user.id),
    );
    const item = normalizeCustomItem(
      found.bucket,
      user,
      input,
      permission.approved,
      permission.canSetPrice,
    );
    const saved: Bucket = {
      ...found.bucket,
      items: [...found.bucket.items, item],
      revision: found.bucket.revision + 1,
      updatedAt: nowIso(),
    };
    saveLocalBucket(database, found.ownerId, found.index, saved);
    writeLocalDatabase(database);
    return Promise.resolve(item);
  }

  approveCustomItem(
    user: SessionUser,
    bucketId: string,
    itemId: string,
    unitPrice: number,
  ): Promise<BucketItem> {
    const database = readLocalDatabase();
    const found = findLocalBucket(database, bucketId);
    assertOwner(found.bucket, user);
    assertBucketMutable(found.bucket);
    const index = found.bucket.items.findIndex((item) => item.id === itemId);
    const item = found.bucket.items[index];
    if (!item || item.source !== 'custom') {
      throw new Error('Custom item was not found.');
    }
    const approved: BucketItem = {
      ...item,
      unitPrice: priceToMinor(unitPrice) / 100,
      active: true,
      approvalStatus: 'approved',
    };
    const items = [...found.bucket.items];
    items[index] = approved;
    saveLocalBucket(database, found.ownerId, found.index, {
      ...found.bucket,
      items,
      revision: found.bucket.revision + 1,
      updatedAt: nowIso(),
    });
    writeLocalDatabase(database);
    return Promise.resolve(approved);
  }

  override setContribution(
    user: SessionUser,
    bucketId: string,
    itemId: string,
    operation: ContributionOperation,
    value: number,
    mutationId: string,
  ): Promise<ContributionMutationRecord> {
    const database = readLocalDatabase();
    assertBucketMutable(findLocalBucket(database, bucketId).bucket);
    return super.setContribution(user, bucketId, itemId, operation, value, mutationId);
  }

  override placeGroupOrder(
    user: SessionUser,
    bucketId: string,
    notes: string,
  ): Promise<Order> {
    const database = readLocalDatabase();
    const found = findLocalBucket(database, bucketId);
    assertOwner(found.bucket, user);
    const mutationId = `${user.id}:${bucketId}:${found.bucket.revision}`;
    const existingMutation = database.orderMutations?.[mutationId];
    if (existingMutation) {
      const existing = database.orders[existingMutation.ownerId]?.find(
        (order) => order.id === existingMutation.orderId,
      );
      if (existing) return Promise.resolve(existing);
    }

    const ordering = beginOrdering(found.bucket, user.id);
    const contributions = database.sharing.contributions[bucketId] ?? [];
    const receipt = buildReceipt(ordering, contributions, ordering.revision);
    const order = createOrder(user.id, {
      bucketId,
      bucketTitle: ordering.title,
      currency: ordering.currency,
      lines: buildGroupOrderLines(ordering),
      notes,
      status: 'placed',
      sourceBucketRevision: ordering.revision,
      participants: toOrderParticipants(contributions),
      groupReceipt: receipt,
    });
    saveLocalBucket(database, found.ownerId, found.index, completeOrdering(ordering));
    addOrderToLocalUser(database, user.id, order);
    for (const participant of receipt.participantReceipts) {
      if (participant.userId !== user.id) {
        addOrderToLocalUser(
          database,
          participant.userId,
          participantOrder(order, participant.userId),
        );
      }
    }
    database.orderMutations = {
      ...database.orderMutations,
      [mutationId]: { orderId: order.id, ownerId: user.id },
    };
    writeLocalDatabase(database);
    return Promise.resolve(order);
  }
}
