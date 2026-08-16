import { describe, expect, it } from 'vitest';

import { buildBucketItemSuggestions } from '@/modules/buckets';
import type { BucketDraft, SessionUser } from '@/modules/data-access';
import { createBucket } from '@/modules/data-access';

const user: SessionUser = {
  id: 'suggestion-owner',
  email: 'suggestions@example.com',
  displayName: 'Suggestion Owner',
  isDemo: true,
};

const bucket = (title: string, itemNames: string[]) => {
  const draft: BucketDraft = {
    title,
    description: '',
    currency: 'EGP',
    items: itemNames.map((name, index) => ({
      id: `${title}-${index}`,
      name,
      description: '',
      category: 'Sides',
      unitPrice: 25 + index,
      active: true,
      sortOrder: index,
    })),
  };
  return createBucket({ id: user.id, displayName: user.displayName }, draft);
};

describe('bucket item history suggestions', () => {
  it('ranks normalized repeated items first and keeps reusable metadata', () => {
    const suggestions = buildBucketItemSuggestions([
      bucket('Lunch', ['Fries', 'Burger']),
      bucket('Dinner', [' fries ', 'Cola']),
      bucket('Weekend', ['FRIES', 'Burger']),
    ]);

    expect(suggestions.map(({ name, count }) => ({ name, count }))).toEqual([
      { name: 'Fries', count: 3 },
      { name: 'Burger', count: 2 },
      { name: 'Cola', count: 1 },
    ]);
    expect(suggestions[0]).toMatchObject({
      category: 'Sides',
      unitPrice: 25,
    });
  });

  it('respects the requested suggestion limit', () => {
    const suggestions = buildBucketItemSuggestions(
      [bucket('Menu', ['Fries', 'Burger', 'Cola'])],
      2,
    );
    expect(suggestions).toHaveLength(2);
  });
});
