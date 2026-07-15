import { nowIso } from '@/lib/date';
import { createId } from '@/lib/id';
import { roundMoney } from '@/lib/money';
import type {
  Bucket,
  BucketDraft,
  BucketItem,
  BucketPricingPolicy,
} from '@/types/domain';

export const MAX_BUCKET_ITEMS = 50;
export const MAX_ORDER_QUANTITY = 99;
export const BUCKET_SCHEMA_VERSION = 3;

export const DEFAULT_PRICING_POLICY: BucketPricingPolicy = {
  vatBasisPoints: 0,
  serviceBasisPoints: 0,
  deliveryMinor: 0,
  vatAllocation: 'proportional',
  serviceAllocation: 'proportional',
  deliveryAllocation: 'equal',
};

const validateBasisPoints = (value: number, label: string): void => {
  if (!Number.isInteger(value) || value < 0 || value > 10_000) {
    throw new Error(`${label} must be a whole percentage between 0% and 100%.`);
  }
};

export const validatePricingPolicy = (
  policy: BucketPricingPolicy,
): BucketPricingPolicy => {
  validateBasisPoints(policy.vatBasisPoints, 'VAT');
  validateBasisPoints(policy.serviceBasisPoints, 'Service charge');
  if (!Number.isSafeInteger(policy.deliveryMinor) || policy.deliveryMinor < 0) {
    throw new Error('Delivery must be a non-negative amount in minor currency units.');
  }

  return { ...policy };
};

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
  if (normalized.length > MAX_BUCKET_ITEMS) {
    throw new Error(`A bucket supports up to ${MAX_BUCKET_ITEMS} items.`);
  }
  if (normalized.some((item) => !item.name)) throw new Error('Every item requires a name.');
  if (normalized.some((item) => !Number.isFinite(item.unitPrice))) {
    throw new Error('Item prices must be valid numbers.');
  }
  if (normalized.some((item) => item.unitPrice < 0)) {
    throw new Error('Item prices cannot be negative.');
  }
  return normalized;
};

export const buildDuplicateBucketDraft = (
  bucket: Bucket,
  copySuffix: string,
): BucketDraft => ({
  title: `${bucket.title} (${copySuffix})`.slice(0, 60),
  description: bucket.description,
  currency: bucket.currency,
  pricingPolicy: {
    ...(bucket.pricingPolicy ?? DEFAULT_PRICING_POLICY),
  },
  customItemMode: bucket.customItemMode ?? 'proposal',
  items: bucket.items.map(
    ({ name, description, category, unitPrice, active, sortOrder }) => ({
      id: '',
      name,
      description,
      category,
      unitPrice,
      active,
      sortOrder,
    }),
  ),
});

export const createBucket = (
  owner: { id: string; displayName: string },
  draft: BucketDraft,
): Bucket => {
  if (!draft.title.trim()) throw new Error('Bucket title is required.');
  const createdAt = nowIso();
  const items = normalizeBucketItems(draft.items).map((item) => ({
    ...item,
    createdByUserId: item.createdByUserId ?? owner.id,
    createdByName: item.createdByName ?? owner.displayName,
    source: item.source ?? 'catalog',
    approvalStatus: item.approvalStatus ?? 'approved',
  }));

  return {
    id: createId('bucket'),
    ownerId: owner.id,
    ownerName: owner.displayName,
    title: draft.title.trim(),
    description: draft.description.trim(),
    currency: draft.currency,
    visibility: 'private',
    status: 'active',
    orderState: 'open',
    customItemMode: draft.customItemMode ?? 'proposal',
    pricingPolicy: validatePricingPolicy(
      draft.pricingPolicy ?? DEFAULT_PRICING_POLICY,
    ),
    frozenAt: null,
    frozenBy: null,
    schemaVersion: BUCKET_SCHEMA_VERSION,
    revision: 1,
    items,
    aggregate: {},
    createdAt,
    updatedAt: createdAt,
  };
};

export const updateBucket = (bucket: Bucket, draft: BucketDraft): Bucket => {
  if ((bucket.orderState ?? 'open') !== 'open') {
    throw new Error('Unfreeze this bucket before changing its menu or pricing.');
  }
  if (!draft.title.trim()) throw new Error('Bucket title is required.');
  const items = normalizeBucketItems(draft.items);
  const itemIds = new Set(items.map((item) => item.id));
  const aggregate = Object.fromEntries(
    Object.entries(bucket.aggregate).filter(([itemId]) => itemIds.has(itemId)),
  );

  return {
    ...bucket,
    title: draft.title.trim(),
    description: draft.description.trim(),
    currency: draft.currency,
    orderState: bucket.orderState ?? 'open',
    pricingPolicy: validatePricingPolicy(
      draft.pricingPolicy ?? bucket.pricingPolicy ?? DEFAULT_PRICING_POLICY,
    ),
    customItemMode: draft.customItemMode ?? bucket.customItemMode ?? 'proposal',
    frozenAt: bucket.frozenAt ?? null,
    frozenBy: bucket.frozenBy ?? null,
    schemaVersion: BUCKET_SCHEMA_VERSION,
    items,
    aggregate,
    revision: bucket.revision + 1,
    updatedAt: nowIso(),
  };
};

/** Upgrades legacy schema-v1/v2 buckets without fabricating historical charges. */
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
    orderState: legacy.orderState ?? 'open',
    customItemMode: legacy.customItemMode ?? 'proposal',
    pricingPolicy: validatePricingPolicy(
      legacy.pricingPolicy ?? DEFAULT_PRICING_POLICY,
    ),
    frozenAt: legacy.frozenAt ?? null,
    frozenBy: legacy.frozenBy ?? null,
    schemaVersion: BUCKET_SCHEMA_VERSION,
    revision: legacy.revision ?? 1,
    items: Array.isArray(legacy.items) ? legacy.items : [],
    aggregate: legacy.aggregate ?? {},
    createdAt: legacy.createdAt ?? nowIso(),
    updatedAt: legacy.updatedAt ?? nowIso(),
  };
};
