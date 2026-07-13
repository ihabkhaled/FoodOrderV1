import { nowIso } from '@/lib/date';
import { createId } from '@/lib/id';
import { roundMoney } from '@/lib/money';
import type { Bucket, BucketDraft, BucketItem } from '@/types/domain';

export const MAX_BUCKET_ITEMS = 50;
export const MAX_ORDER_QUANTITY = 99;
export const BUCKET_SCHEMA_VERSION = 2;

export const normalizeBucketItems = (items: BucketDraft['items']): BucketItem[] => {
  const normalized = items.map((item, index) => ({
    ...item,
    id: item.id || createId('item'),
    name: item.name.trim(),
    description: item.description.trim(),
    category: item.category.trim(),
    unitPrice: roundMoney(item.unitPrice),
    active: item.active,
    sortOrder: item.sortOrder ?? index,
  }));
  if (normalized.length === 0) throw new Error('A bucket requires at least one item.');
  if (normalized.length > MAX_BUCKET_ITEMS) throw new Error(`A bucket supports up to ${MAX_BUCKET_ITEMS} items.`);
  if (normalized.some((item) => !item.name)) throw new Error('Every item requires a name.');
  if (normalized.some((item) => !Number.isFinite(item.unitPrice))) throw new Error('Item prices must be valid numbers.');
  if (normalized.some((item) => item.unitPrice < 0)) throw new Error('Item prices cannot be negative.');
  return normalized;
};

export const createBucket = (
  owner: { id: string; displayName: string },
  draft: BucketDraft,
): Bucket => {
  if (!draft.title.trim()) throw new Error('Bucket title is required.');
  const createdAt = nowIso();
  return {
    id: createId('bucket'),
    ownerId: owner.id,
    ownerName: owner.displayName,
    title: draft.title.trim(),
    description: draft.description.trim(),
    currency: draft.currency,
    visibility: 'private',
    status: 'active',
    schemaVersion: BUCKET_SCHEMA_VERSION,
    revision: 1,
    items: normalizeBucketItems(draft.items),
    aggregate: {},
    createdAt,
    updatedAt: createdAt,
  };
};

export const updateBucket = (bucket: Bucket, draft: BucketDraft): Bucket => {
  if (!draft.title.trim()) throw new Error('Bucket title is required.');
  const items = normalizeBucketItems(draft.items);
  const itemIds = new Set(items.map((item) => item.id));
  // Deleted items atomically drop out of the aggregate; order snapshots keep history.
  const aggregate = Object.fromEntries(
    Object.entries(bucket.aggregate).filter(([itemId]) => itemIds.has(itemId)),
  );
  return {
    ...bucket,
    title: draft.title.trim(),
    description: draft.description.trim(),
    currency: draft.currency,
    items,
    aggregate,
    revision: bucket.revision + 1,
    updatedAt: nowIso(),
  };
};

/** Upgrades legacy schema-v1 buckets (owned via userId, no sharing fields). */
export const upgradeLegacyBucket = (
  raw: Record<string, unknown>,
  fallbackOwner: { id: string; displayName: string },
): Bucket => {
  const legacy = raw as Partial<Bucket> & { userId?: string };
  return {
    id: legacy.id ?? createId('bucket'),
    ownerId: legacy.ownerId ?? legacy.userId ?? fallbackOwner.id,
    ownerName: legacy.ownerName ?? fallbackOwner.displayName,
    title: legacy.title ?? 'Untitled bucket',
    description: legacy.description ?? '',
    currency: legacy.currency ?? 'EGP',
    visibility: legacy.visibility ?? 'private',
    status: 'active',
    schemaVersion: BUCKET_SCHEMA_VERSION,
    revision: legacy.revision ?? 1,
    items: Array.isArray(legacy.items) ? legacy.items : [],
    aggregate: legacy.aggregate ?? {},
    createdAt: legacy.createdAt ?? nowIso(),
    updatedAt: legacy.updatedAt ?? nowIso(),
  };
};
