import { describe, expect, it } from 'vitest';

import {
  decodeSortCursor,
  encodeSortCursor,
  MAX_PAGE_SIZE,
  normalizePageLimit,
  paginateDescending,
} from '@/shared/helpers';

const records = [
  { id: 'a', updatedAt: '2026-01-03T00:00:00.000Z' },
  { id: 'c', updatedAt: '2026-01-02T00:00:00.000Z' },
  { id: 'b', updatedAt: '2026-01-02T00:00:00.000Z' },
  { id: 'd', updatedAt: '2026-01-01T00:00:00.000Z' },
] as const;

const updatedAt = (item: (typeof records)[number]): string => item.updatedAt;

describe('cursor pagination', () => {
  it('normalizes limits and enforces safe bounds', () => {
    expect(normalizePageLimit(undefined)).toBe(20);
    expect(normalizePageLimit(MAX_PAGE_SIZE + 100)).toBe(MAX_PAGE_SIZE);
    expect(() => normalizePageLimit(0)).toThrow('positive integer');
    expect(() => normalizePageLimit(1.5)).toThrow('positive integer');
  });

  it('round-trips an opaque sort cursor', () => {
    const firstRecord = records[0];
    const value = {
      sortValue: firstRecord.updatedAt,
      id: firstRecord.id,
    };
    expect(decodeSortCursor(encodeSortCursor(value))).toEqual(value);
  });

  it('rejects malformed cursors', () => {
    expect(() => decodeSortCursor('not-json')).toThrow('cursor is invalid');
    expect(() => decodeSortCursor(encodeURIComponent('{}'))).toThrow(
      'cursor is invalid',
    );
  });

  it('returns deterministic pages without duplicates', () => {
    const first = paginateDescending(records, { limit: 2 }, updatedAt);
    expect(first.items.map(({ id }) => id)).toEqual(['a', 'c']);
    expect(first.hasMore).toBe(true);
    expect(first.nextCursor).not.toBeNull();
    if (!first.nextCursor) throw new Error('Expected the first page cursor.');

    const second = paginateDescending(
      records,
      { limit: 2, cursor: first.nextCursor },
      updatedAt,
    );
    expect(second.items.map(({ id }) => id)).toEqual(['b', 'd']);
    expect(second.hasMore).toBe(false);
    expect(second.nextCursor).toBeNull();
  });

  it('fails closed when a cursor belongs to another result set', () => {
    const cursor = encodeSortCursor({
      sortValue: '2020-01-01T00:00:00.000Z',
      id: 'missing',
    });
    expect(() => paginateDescending(records, { cursor }, updatedAt)).toThrow(
      'does not match',
    );
  });
});
