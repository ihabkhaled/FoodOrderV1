import type { Bucket } from '@/modules/data-access';

import type { BucketItemSuggestion } from '../types/bucket-item-suggestion.types';

const normalizeSuggestionKey = (value: string): string =>
  value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();

export const buildBucketItemSuggestions = (
  buckets: readonly Bucket[],
  limit = 8,
): BucketItemSuggestion[] => {
  const byName = new Map<string, BucketItemSuggestion>();

  for (const bucket of buckets) {
    for (const item of bucket.items) {
      const name = item.name.trim();
      if (!name) continue;
      const key = normalizeSuggestionKey(name);
      const existing = byName.get(key);
      if (existing) {
        existing.count += 1;
        continue;
      }
      byName.set(key, {
        key,
        name,
        category: item.category.trim(),
        unitPrice: item.unitPrice,
        count: 1,
      });
    }
  }

  return [...byName.values()]
    .toSorted(
      (left, right) =>
        right.count - left.count || left.name.localeCompare(right.name),
    )
    .slice(0, Math.max(0, limit));
};
