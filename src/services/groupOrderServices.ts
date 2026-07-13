import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
} from 'firebase/firestore';

import { DEFAULT_PRICING_POLICY, validatePricingPolicy } from '@/lib/bucket';
import {
  assertBucketMutable,
  beginOrdering,
  completeOrdering,
  freezeBucket,
  unfreezeBucket,
} from '@/lib/bucketLifecycle';
import { nowIso } from '@/lib/date';
import { calculateGroupOrderReceipt } from '@/lib/groupOrder';
import { createId } from '@/lib/id';
import { createOrder } from '@/lib/order';
import {
  buildGroupOrderLines,
  memberCan,
  toOrderParticipants,
} from '@/lib/sharing';
import {
  FirestoreSharingService,
  getFirebaseRuntime,
} from '@/services/firebaseServices';
import { LocalSharingService } from '@/services/localServices';
import type {
  Bucket,
  BucketActivityEvent,
  BucketContribution,
  BucketItem,
  BucketMember,
  BucketPricingPolicy,
  ContributionMutationRecord,
  ContributionOperation,
  GroupOrderReceiptSnapshot,
  Order,
  SessionUser,
} from '@/types/domain';

const LOCAL_DATABASE_KEY = 'foodorder:v1:database';
const PERMISSION_ERROR = 'You do not have permission for this action.';

interface LocalSharingTables {
  members: Record<string, BucketMember[]>;
  contributions: Record<string, BucketContribution[]>;
  activity: Record<string, BucketActivityEvent[]>;
  [key: string]: unknown;
}

interface LocalGroupOrderDatabase {
  buckets: Record<string, Bucket[]>;
  orders: Record<string, Order[]>;
  sharing: LocalSharingTables;
  orderMutations?: Record<string, { orderId: string; ownerId: string }>;
  [key: string]: unknown;
}

export interface CustomItemInput {
  name: string;
  description: string;
  category: string;
  unitPrice: number;
}

export interface MemberCustomItemPermissions {
  canCreateCustomItems: boolean;
  canSetCustomItemPrice: boolean;
}

const readLocalDatabase = (): LocalGroupOrderDatabase => {
  const raw = localStorage.getItem(LOCAL_DATABASE_KEY);
  if (!raw) throw new Error('The local database is not initialized.');

  return JSON.parse(raw) as LocalGroupOrderDatabase;
};

const writeLocalDatabase = (database: LocalGroupOrderDatabase): void => {
  localStorage.setItem(LOCAL_DATABASE_KEY, JSON.stringify(database));
};

const findLocalBucket = (
  database: LocalGroupOrderDatabase,
  bucketId: string,
): { ownerId: string; bucket: Bucket; index: number } => {
  for (const [ownerId, buckets] of Object.entries(database.buckets)) {
    const index = buckets.findIndex((bucket) => bucket.id === bucketId);
    if (index >= 0) {
      const bucket = buckets[index];
      if (!bucket) break;
      return { ownerId, bucket, index };
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

const assertOwner = (bucket: Bucket, user: SessionUser): void => {
  if (bucket.ownerId !== user.id) throw new Error(PERMISSION_ERROR);
};

const priceToMinor = (price: number): number => {
  const value = Math.round(price * 100);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('Item prices must be safe non-negative amounts.');
  }
  return value;
};

const buildReceipt = (
  bucket: Bucket,
  contributions: BucketContribution[],
  bucketRevision: number,
): GroupOrderReceiptSnapshot => {
  const participants = contributions
    .map((contribution) => ({
      userId: contribution.userId,
      displayName: contribution.displayName,
      items: Object.entries(contribution.quantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([itemId, quantity]) => {
          const item = bucket.items.find((candidate) => candidate.id === itemId);
          if (!item) throw new Error('A contribution references a missing item.');

          return {
            itemId,
            itemName: item.name,
            quantity,
            unitPriceMinor: priceToMinor(item.unitPrice),
            createdByUserId: item.createdByUserId ?? bucket.ownerId,
            createdByName: item.createdByName ?? bucket.ownerName,
          };
        }),
    }))
    .filter((participant) => participant.items.length > 0);

  const receipt = calculateGroupOrderReceipt({
    currency: bucket.currency,
    participants,
    policy: bucket.pricingPolicy ?? DEFAULT_PRICING_POLICY,
  });

  return {
    ...receipt,
    pricingPolicy: { ...bucket.pricingPolicy },
    bucketRevision,
  };
};

const participantOrder = (order: Order, userId: string): Order => {
  const receipt = order.groupReceipt?.participantReceipts.find(
    (candidate) => candidate.userId === userId,
  );
  if (!receipt || !order.groupReceipt) {
    throw new Error('The participant receipt was not found.');
  }

  return {
    ...order,
    userId,
    lines: receipt.lines.map((line) => ({
      id: createId('line'),
      bucketItemId: line.itemId,
      name: line.itemName,
      quantity: line.quantity,
      unitPrice: line.unitPriceMinor / 100,
      lineTotal: line.lineTotalMinor / 100,
    })),
    subtotal: receipt.itemSubtotalMinor / 100,
    total: receipt.totalMinor / 100,
    participants:
      order.participants?.filter((participant) => participant.userId === userId) ?? null,
    groupReceipt: {
      ...order.groupReceipt,
      participantReceipts: [receipt],
      items: order.groupReceipt.items.map((item) => ({
        ...item,
        orderedBy: item.orderedBy.filter((participant) => participant.userId === userId),
      })),
    },
  };
};

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

const normalizeCustomItem = (
  bucket: Bucket,
  user: SessionUser,
  input: CustomItemInput,
  approved: boolean,
  canSetPrice: boolean,
): BucketItem => {
  const name = input.name.trim();
  if (!name) throw new Error('Custom items require a name.');
  if (name.length > 120) throw new Error('Custom item names are limited to 120 characters.');
  if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0) {
    throw new Error('Custom item prices must be valid non-negative numbers.');
  }

  return {
    id: createId('item'),
    name,
    description: input.description.trim().slice(0, 500),
    category: input.category.trim().slice(0, 80),
    unitPrice: canSetPrice ? Math.round(input.unitPrice * 100) / 100 : 0,
    active: approved,
    sortOrder: bucket.items.length,
    createdByUserId: user.id,
    createdByName: user.displayName,
    source: 'custom',
    approvalStatus: approved ? 'approved' : 'pending',
  };
};

const canCreateCustomItem = (
  bucket: Bucket,
  user: SessionUser,
  member: BucketMember | null,
): { approved: boolean; canSetPrice: boolean } => {
  if (bucket.ownerId === user.id) return { approved: true, canSetPrice: true };
  if (!member || !memberCan(member, 'contribute') || !member.canCreateCustomItems) {
    throw new Error(PERMISSION_ERROR);
  }
  if (bucket.customItemMode === 'disabled') throw new Error('Custom items are disabled for this bucket.');

  return {
    approved: bucket.customItemMode === 'direct',
    canSetPrice: member.canSetCustomItemPrice === true,
  };
};

export class LocalGroupOrderService extends LocalSharingService {
  async freezeBucket(user: SessionUser, bucketId: string): Promise<Bucket> {
    const database = readLocalDatabase();
    const found = findLocalBucket(database, bucketId);
    assertOwner(found.bucket, user);
    const saved = freezeBucket(found.bucket, user.id);
    saveLocalBucket(database, found.ownerId, found.index, saved);
    writeLocalDatabase(database);
    return saved;
  }

  async unfreezeBucket(user: SessionUser, bucketId: string): Promise<Bucket> {
    const database = readLocalDatabase();
    const found = findLocalBucket(database, bucketId);
    assertOwner(found.bucket, user);
    const saved = unfreezeBucket(found.bucket);
    saveLocalBucket(database, found.ownerId, found.index, saved);
    writeLocalDatabase(database);
    return saved;
  }

  async updatePricingPolicy(
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
    return saved;
  }

  async setMemberCustomItemPermissions(
    user: SessionUser,
    bucketId: string,
    memberId: string,
    permissions: MemberCustomItemPermissions,
  ): Promise<BucketMember> {
    const database = readLocalDatabase();
    const found = findLocalBucket(database, bucketId);
    assertOwner(found.bucket, user);
    const members = database.sharing.members[bucketId] ?? [];
    const index = members.findIndex((member) => member.userId === memberId);
    const member = members[index];
    if (!member || member.role === 'owner') throw new Error('Member was not found.');
    const saved = { ...member, ...permissions, updatedAt: nowIso() };
    members[index] = saved;
    database.sharing.members[bucketId] = members;
    writeLocalDatabase(database);
    return saved;
  }

  async addCustomItem(
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
    const saved = {
      ...found.bucket,
      items: [...found.bucket.items, item],
      revision: found.bucket.revision + 1,
      updatedAt: nowIso(),
    };
    saveLocalBucket(database, found.ownerId, found.index, saved);
    writeLocalDatabase(database);
    return item;
  }

  async approveCustomItem(
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
    if (!item || item.source !== 'custom') throw new Error('Custom item was not found.');
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
    return approved;
  }

  override async setContribution(
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

  override async placeGroupOrder(
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
      if (existing) return existing;
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
    const completed = completeOrdering(ordering);
    saveLocalBucket(database, found.ownerId, found.index, completed);
    addOrderToLocalUser(database, user.id, order);
    for (const participant of receipt.participantReceipts) {
      if (participant.userId !== user.id) {
        addOrderToLocalUser(database, participant.userId, participantOrder(order, participant.userId));
      }
    }
    database.orderMutations = {
      ...(database.orderMutations ?? {}),
      [mutationId]: { orderId: order.id, ownerId: user.id },
    };
    writeLocalDatabase(database);
    return order;
  }
}

const bucketReference = (bucketId: string) =>
  doc(getFirebaseRuntime().firestore, 'buckets', bucketId);

const memberReference = (bucketId: string, userId: string) =>
  doc(getFirebaseRuntime().firestore, 'buckets', bucketId, 'members', userId);

export class FirestoreGroupOrderService extends FirestoreSharingService {
  async freezeBucket(user: SessionUser, bucketId: string): Promise<Bucket> {
    const reference = bucketReference(bucketId);
    return runTransaction(getFirebaseRuntime().firestore, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('Bucket was not found.');
      const bucket = snapshot.data() as Bucket;
      assertOwner(bucket, user);
      const saved = freezeBucket(bucket, user.id);
      transaction.set(reference, saved);
      return saved;
    });
  }

  async unfreezeBucket(user: SessionUser, bucketId: string): Promise<Bucket> {
    const reference = bucketReference(bucketId);
    return runTransaction(getFirebaseRuntime().firestore, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('Bucket was not found.');
      const bucket = snapshot.data() as Bucket;
      assertOwner(bucket, user);
      const saved = unfreezeBucket(bucket);
      transaction.set(reference, saved);
      return saved;
    });
  }

  async updatePricingPolicy(
    user: SessionUser,
    bucketId: string,
    policy: BucketPricingPolicy,
  ): Promise<Bucket> {
    const reference = bucketReference(bucketId);
    return runTransaction(getFirebaseRuntime().firestore, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('Bucket was not found.');
      const bucket = snapshot.data() as Bucket;
      assertOwner(bucket, user);
      assertBucketMutable(bucket);
      const saved: Bucket = {
        ...bucket,
        pricingPolicy: validatePricingPolicy(policy),
        revision: bucket.revision + 1,
        updatedAt: nowIso(),
      };
      transaction.set(reference, saved);
      return saved;
    });
  }

  async setMemberCustomItemPermissions(
    user: SessionUser,
    bucketId: string,
    memberId: string,
    permissions: MemberCustomItemPermissions,
  ): Promise<BucketMember> {
    const bucketSnapshot = await getDoc(bucketReference(bucketId));
    if (!bucketSnapshot.exists()) throw new Error('Bucket was not found.');
    assertOwner(bucketSnapshot.data() as Bucket, user);
    const reference = memberReference(bucketId, memberId);
    const memberSnapshot = await getDoc(reference);
    if (!memberSnapshot.exists()) throw new Error('Member was not found.');
    const member = memberSnapshot.data() as BucketMember;
    if (member.role === 'owner') throw new Error('Owner permissions cannot be reduced.');
    const saved = { ...member, ...permissions, updatedAt: nowIso() };
    await setDoc(reference, saved);
    return saved;
  }

  async addCustomItem(
    user: SessionUser,
    bucketId: string,
    input: CustomItemInput,
  ): Promise<BucketItem> {
    const reference = bucketReference(bucketId);
    const firestore = getFirebaseRuntime().firestore;
    return runTransaction(firestore, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('Bucket was not found.');
      const bucket = snapshot.data() as Bucket;
      assertBucketMutable(bucket);
      const memberSnapshot =
        bucket.ownerId === user.id
          ? null
          : await transaction.get(memberReference(bucketId, user.id));
      const member = memberSnapshot?.exists()
        ? (memberSnapshot.data() as BucketMember)
        : null;
      const permission = canCreateCustomItem(bucket, user, member);
      const item = normalizeCustomItem(
        bucket,
        user,
        input,
        permission.approved,
        permission.canSetPrice,
      );
      transaction.update(reference, {
        items: [...bucket.items, item],
        revision: bucket.revision + 1,
        updatedAt: nowIso(),
      });
      return item;
    });
  }

  async approveCustomItem(
    user: SessionUser,
    bucketId: string,
    itemId: string,
    unitPrice: number,
  ): Promise<BucketItem> {
    const reference = bucketReference(bucketId);
    return runTransaction(getFirebaseRuntime().firestore, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('Bucket was not found.');
      const bucket = snapshot.data() as Bucket;
      assertOwner(bucket, user);
      assertBucketMutable(bucket);
      const index = bucket.items.findIndex((item) => item.id === itemId);
      const item = bucket.items[index];
      if (!item || item.source !== 'custom') throw new Error('Custom item was not found.');
      const approved: BucketItem = {
        ...item,
        unitPrice: priceToMinor(unitPrice) / 100,
        active: true,
        approvalStatus: 'approved',
      };
      const items = [...bucket.items];
      items[index] = approved;
      transaction.update(reference, {
        items,
        revision: bucket.revision + 1,
        updatedAt: nowIso(),
      });
      return approved;
    });
  }

  override async setContribution(
    user: SessionUser,
    bucketId: string,
    itemId: string,
    operation: ContributionOperation,
    value: number,
    mutationId: string,
  ): Promise<ContributionMutationRecord> {
    const snapshot = await getDoc(bucketReference(bucketId));
    if (!snapshot.exists()) throw new Error('Bucket was not found.');
    assertBucketMutable(snapshot.data() as Bucket);
    return super.setContribution(user, bucketId, itemId, operation, value, mutationId);
  }

  override async placeGroupOrder(
    user: SessionUser,
    bucketId: string,
    notes: string,
  ): Promise<Order> {
    const firestore = getFirebaseRuntime().firestore;
    const contributionSnapshots = await getDocs(
      collection(firestore, 'buckets', bucketId, 'contributions'),
    );
    const contributionReferences = contributionSnapshots.docs.map((snapshot) => snapshot.ref);

    return runTransaction(firestore, async (transaction) => {
      const bucketRef = bucketReference(bucketId);
      const bucketSnapshot = await transaction.get(bucketRef);
      if (!bucketSnapshot.exists()) throw new Error('Bucket was not found.');
      const bucket = bucketSnapshot.data() as Bucket;
      assertOwner(bucket, user);
      const mutationId = `${user.id}_${bucket.revision}`;
      const mutationRef = doc(firestore, 'buckets', bucketId, 'orderMutations', mutationId);
      const mutationSnapshot = await transaction.get(mutationRef);
      if (mutationSnapshot.exists()) {
        const mutation = mutationSnapshot.data() as { orderId: string };
        const orderSnapshot = await transaction.get(
          doc(firestore, 'users', user.id, 'orders', mutation.orderId),
        );
        if (orderSnapshot.exists()) return orderSnapshot.data() as Order;
      }

      const contributions: BucketContribution[] = [];
      for (const reference of contributionReferences) {
        const snapshot = await transaction.get(reference);
        if (snapshot.exists()) contributions.push(snapshot.data() as BucketContribution);
      }
      const ordering = beginOrdering(bucket, user.id);
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
      transaction.set(bucketRef, completeOrdering(ordering));
      transaction.set(doc(firestore, 'users', user.id, 'orders', order.id), order);
      for (const participant of receipt.participantReceipts) {
        if (participant.userId !== user.id) {
          transaction.set(
            doc(firestore, 'users', participant.userId, 'orders', order.id),
            participantOrder(order, participant.userId),
          );
        }
      }
      transaction.set(mutationRef, {
        orderId: order.id,
        ownerId: user.id,
        createdAt: nowIso(),
      });
      return order;
    });
  }
}
