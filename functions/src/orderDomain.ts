import { randomUUID } from 'node:crypto';

import {
  calculateGroupOrderReceipt,
  type GroupOrderChargePolicy,
  type GroupOrderReceipt,
  type SupportedCurrency,
} from '../../packages/group-order-engine/src/index.js';

export interface BucketItemRecord {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  unitPrice?: number;
  active?: boolean;
  sortOrder?: number;
  createdByUserId?: string;
  createdByName?: string;
  source?: 'catalog' | 'custom';
  approvalStatus?: 'approved' | 'pending' | 'rejected';
}

export interface BucketRecord {
  id: string;
  ownerId: string;
  ownerName?: string;
  title?: string;
  currency?: SupportedCurrency;
  revision?: number;
  items?: BucketItemRecord[];
  aggregate?: Record<string, number>;
  orderState?: 'open' | 'frozen' | 'ordering' | 'ordered';
  customItemMode?: 'disabled' | 'proposal' | 'direct';
  pricingPolicy?: Partial<GroupOrderChargePolicy>;
  frozenAt?: string | null;
  frozenBy?: string | null;
  lastOrderId?: string | null;
  updatedAt?: string;
}

export interface ContributionRecord {
  userId?: string;
  displayName?: string;
  quantities?: Record<string, number>;
}

export interface OrderRecord {
  id: string;
  userId: string;
  bucketId: string;
  bucketTitle: string;
  status: 'placed';
  currency: SupportedCurrency;
  lines: {
    id: string;
    bucketItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  notes: string;
  subtotal: number;
  total: number;
  sourceBucketRevision: number;
  participants: {
    userId: string;
    displayName: string;
    quantities: Record<string, number>;
  }[];
  groupReceipt: GroupOrderReceipt & {
    pricingPolicy: GroupOrderChargePolicy;
    bucketRevision: number;
  };
  createdAt: string;
  updatedAt: string;
  placedAt: string;
  completedAt: null;
  cancelledAt: null;
}

export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderValidationError';
  }
}

const CURRENCIES = new Set<SupportedCurrency>([
  'EGP',
  'USD',
  'EUR',
  'GBP',
  'SAR',
  'AED',
]);
const ALLOCATIONS = new Set(['equal', 'proportional']);

const text = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const whole = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : fallback;

const pricingPolicy = (
  value: Partial<GroupOrderChargePolicy> | undefined,
): GroupOrderChargePolicy => ({
  vatBasisPoints: Math.min(10_000, whole(value?.vatBasisPoints)),
  serviceBasisPoints: Math.min(10_000, whole(value?.serviceBasisPoints)),
  deliveryMinor: whole(value?.deliveryMinor),
  vatAllocation: ALLOCATIONS.has(value?.vatAllocation ?? '')
    ? (value?.vatAllocation as GroupOrderChargePolicy['vatAllocation'])
    : 'proportional',
  serviceAllocation: ALLOCATIONS.has(value?.serviceAllocation ?? '')
    ? (value?.serviceAllocation as GroupOrderChargePolicy['serviceAllocation'])
    : 'proportional',
  deliveryAllocation: ALLOCATIONS.has(value?.deliveryAllocation ?? '')
    ? (value?.deliveryAllocation as GroupOrderChargePolicy['deliveryAllocation'])
    : 'equal',
});

const currency = (value: unknown): SupportedCurrency =>
  typeof value === 'string' && CURRENCIES.has(value as SupportedCurrency)
    ? (value as SupportedCurrency)
    : 'EGP';

const quantity = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.max(1, Math.trunc(value))
    : 0;

const priceMinor = (value: unknown): number => {
  const price =
    typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const minor = Math.round(Math.max(0, price) * 100);
  if (!Number.isSafeInteger(minor)) {
    throw new OrderValidationError(
      'An item has a price outside the supported range.',
    );
  }
  return minor;
};

const mergeContributions = (
  contributions: ContributionRecord[],
  availableIds: Set<string>,
): Map<
  string,
  { userId: string; displayName: string; quantities: Record<string, number> }
> => {
  const merged = new Map<
    string,
    { userId: string; displayName: string; quantities: Record<string, number> }
  >();

  for (const raw of contributions) {
    const userId = text(raw.userId, '');
    if (!userId) continue;
    const existing = merged.get(userId) ?? {
      userId,
      displayName: text(raw.displayName, 'Participant'),
      quantities: {},
    };
    for (const [itemId, rawQuantity] of Object.entries(raw.quantities ?? {})) {
      if (!availableIds.has(itemId)) continue;
      const normalized = quantity(rawQuantity);
      if (normalized > 0) existing.quantities[itemId] = normalized;
    }
    if (Object.keys(existing.quantities).length > 0) merged.set(userId, existing);
  }

  return merged;
};

const ownerFallbackContribution = (
  bucket: BucketRecord,
  availableIds: Set<string>,
): ContributionRecord | null => {
  const quantities: Record<string, number> = {};
  for (const [itemId, rawQuantity] of Object.entries(bucket.aggregate ?? {})) {
    if (!availableIds.has(itemId)) continue;
    const normalized = quantity(rawQuantity);
    if (normalized > 0) quantities[itemId] = normalized;
  }

  return Object.keys(quantities).length === 0
    ? null
    : {
        userId: bucket.ownerId,
        displayName: text(bucket.ownerName, 'Bucket owner'),
        quantities,
      };
};

export const buildOrderSnapshot = (
  bucket: BucketRecord,
  rawContributions: ContributionRecord[],
  ownerId: string,
  notes: string,
  orderId: string,
  timestamp: string,
): { order: OrderRecord; aggregate: Record<string, number> } => {
  const ownerName = text(bucket.ownerName, 'Bucket owner');
  const items = (bucket.items ?? [])
    .filter(
      (item) => item.active !== false && item.approvalStatus !== 'pending',
    )
    .map((item) => ({
      ...item,
      id: text(item.id, ''),
      name: text(item.name, 'Custom item'),
      createdByUserId: text(item.createdByUserId, bucket.ownerId),
      createdByName: text(item.createdByName, ownerName),
      unitPrice: Math.max(
        0,
        typeof item.unitPrice === 'number' && Number.isFinite(item.unitPrice)
          ? item.unitPrice
          : 0,
      ),
    }))
    .filter((item) => item.id);

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const availableIds = new Set(itemsById.keys());
  const fallback = ownerFallbackContribution(bucket, availableIds);
  const contributions =
    rawContributions.length === 0 && fallback ? [fallback] : rawContributions;
  const merged = mergeContributions(contributions, availableIds);
  if (merged.size === 0 && fallback) {
    for (const [key, value] of mergeContributions([fallback], availableIds)) {
      merged.set(key, value);
    }
  }

  const participants = [...merged.values()];
  if (participants.length === 0) {
    throw new OrderValidationError(
      'Choose at least one available item before placing the order.',
    );
  }

  const receiptParticipants = participants.map((participant) => ({
    userId: participant.userId,
    displayName: participant.displayName,
    items: Object.entries(participant.quantities).map(
      ([itemId, itemQuantity]) => {
        const item = itemsById.get(itemId);
        if (!item) {
          throw new OrderValidationError('An order item is no longer available.');
        }
        return {
          itemId,
          itemName: item.name,
          quantity: itemQuantity,
          unitPriceMinor: priceMinor(item.unitPrice),
          createdByUserId: item.createdByUserId,
          createdByName: item.createdByName,
        };
      },
    ),
  }));

  const policy = pricingPolicy(bucket.pricingPolicy);
  let receipt: GroupOrderReceipt;
  try {
    receipt = calculateGroupOrderReceipt({
      currency: currency(bucket.currency),
      participants: receiptParticipants,
      policy,
    });
  } catch (error) {
    throw new OrderValidationError(
      error instanceof Error
        ? error.message
        : 'The receipt could not be calculated.',
    );
  }

  const aggregate: Record<string, number> = {};
  for (const participant of participants) {
    for (const [itemId, itemQuantity] of Object.entries(
      participant.quantities,
    )) {
      aggregate[itemId] = (aggregate[itemId] ?? 0) + itemQuantity;
    }
  }

  const revision = Math.max(1, whole(bucket.revision, 1)) + 1;
  const lines = items
    .filter((item) => (aggregate[item.id] ?? 0) > 0)
    .map((item) => ({
      id: randomUUID(),
      bucketItemId: item.id,
      name: item.name,
      quantity: aggregate[item.id] ?? 0,
      unitPrice: item.unitPrice,
      lineTotal:
        Math.round((aggregate[item.id] ?? 0) * item.unitPrice * 100) / 100,
    }));

  const order: OrderRecord = {
    id: orderId,
    userId: ownerId,
    bucketId: bucket.id,
    bucketTitle: text(bucket.title, 'Group order'),
    status: 'placed',
    currency: currency(bucket.currency),
    lines,
    notes,
    subtotal: receipt.itemSubtotalMinor / 100,
    total: receipt.grandTotalMinor / 100,
    sourceBucketRevision: revision,
    participants,
    groupReceipt: {
      ...receipt,
      pricingPolicy: policy,
      bucketRevision: revision,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    placedAt: timestamp,
    completedAt: null,
    cancelledAt: null,
  };

  return { order, aggregate };
};

export const participantOrder = (
  order: OrderRecord,
  participantId: string,
): OrderRecord => {
  const receipt = order.groupReceipt.participantReceipts.find(
    (candidate) => candidate.userId === participantId,
  );
  if (!receipt) {
    throw new OrderValidationError(
      'A participant receipt could not be generated.',
    );
  }

  return {
    ...order,
    userId: participantId,
    lines: receipt.lines.map((line) => ({
      id: randomUUID(),
      bucketItemId: line.itemId,
      name: line.itemName,
      quantity: line.quantity,
      unitPrice: line.unitPriceMinor / 100,
      lineTotal: line.lineTotalMinor / 100,
    })),
    subtotal: receipt.itemSubtotalMinor / 100,
    total: receipt.totalMinor / 100,
    participants: order.participants.filter(
      (participant) => participant.userId === participantId,
    ),
    groupReceipt: {
      ...order.groupReceipt,
      participantReceipts: [receipt],
      items: order.groupReceipt.items
        .map((item) => ({
          ...item,
          orderedBy: item.orderedBy.filter(
            (participant) => participant.userId === participantId,
          ),
        }))
        .filter((item) => item.orderedBy.length > 0),
    },
  };
};
