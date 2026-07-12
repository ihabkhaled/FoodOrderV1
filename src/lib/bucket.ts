import { nowIso } from '@/lib/date';
import { createId } from '@/lib/id';
import { roundMoney } from '@/lib/money';
import type { Bucket, BucketDraft, BucketItem } from '@/types/domain';

export const MAX_BUCKET_ITEMS = 50;
export const MAX_ORDER_QUANTITY = 99;

export const normalizeBucketItems = (items: BucketDraft['items']): BucketItem[] => {
  const normalized = items.map((item, index) => ({
    ...item,
    id: item.id || createId('item'),
    name: item.name.trim(),
    description: item.description.trim(),
    category: item.category.trim(),
    unitPrice: roundMoney(Number(item.unitPrice)),
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

export const createBucket = (userId: string, draft: BucketDraft): Bucket => {
  if (!draft.title.trim()) throw new Error('Bucket title is required.');
  const createdAt = nowIso();
  return {
    id: createId('bucket'),
    userId,
    title: draft.title.trim(),
    description: draft.description.trim(),
    currency: draft.currency,
    items: normalizeBucketItems(draft.items),
    createdAt,
    updatedAt: createdAt,
  };
};

export const updateBucket = (bucket: Bucket, draft: BucketDraft): Bucket => {
  if (!draft.title.trim()) throw new Error('Bucket title is required.');
  return {
  ...bucket,
  title: draft.title.trim(),
  description: draft.description.trim(),
  currency: draft.currency,
  items: normalizeBucketItems(draft.items),
  updatedAt: nowIso(),
  };
};
