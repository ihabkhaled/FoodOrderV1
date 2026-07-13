import { describe, expect, it } from 'vitest';

import { createBucket, MAX_BUCKET_ITEMS, normalizeBucketItems, updateBucket, upgradeLegacyBucket } from '@/lib/bucket';

const owner = { id: 'u', displayName: 'User' };

describe('bucket domain', () => {
  it('normalizes a valid bucket', () => {
    const b = createBucket(owner, { title: ' Breakfast ', description: ' Friday ', currency: 'EGP', items: [{ id: '', name: ' Foul ', description: '', category: 'Egyptian', unitPrice: 12.345, active: true }] });
    expect(b.title).toBe('Breakfast');
    expect(b.items[0]?.unitPrice).toBe(12.35);
    expect(b.ownerId).toBe('u');
    expect(b.visibility).toBe('private');
    expect(b.schemaVersion).toBe(2);
    expect(b.revision).toBe(1);
    expect(b.aggregate).toEqual({});
  });
  it('rejects invalid item collections', () => {
    expect(() => normalizeBucketItems([])).toThrow(/at least one/);
    expect(() => normalizeBucketItems([{ id: 'x', name: ' ', description: '', category: '', unitPrice: 0, active: true }])).toThrow(/name/);
    expect(() => normalizeBucketItems(Array.from({ length: MAX_BUCKET_ITEMS + 1 }, (_, i) => ({ id: `${i}`, name: `Item ${i}`, description: '', category: '', unitPrice: 1, active: true })))).toThrow(/supports up to/);
  });
  it('preserves identity and bumps revision on update', () => {
    const b = createBucket(owner, { title: 'Old', description: '', currency: 'EGP', items: [{ id: 'i', name: 'Tea', description: '', category: '', unitPrice: 10, active: true }] });
    const updated = updateBucket(b, { title: 'New', description: '', currency: 'USD', items: b.items });
    expect(updated.id).toBe(b.id);
    expect(updated.revision).toBe(b.revision + 1);
  });
  it('drops deleted items from the aggregate on update', () => {
    const b = { ...createBucket(owner, { title: 'T', description: '', currency: 'EGP', items: [{ id: 'a', name: 'A', description: '', category: '', unitPrice: 1, active: true }, { id: 'b', name: 'B', description: '', category: '', unitPrice: 2, active: true }] }), aggregate: { a: 3, b: 2 } };
    const [firstItem] = b.items;
    if (!firstItem) throw new Error('expected an item');
    const updated = updateBucket(b, { title: 'T', description: '', currency: 'EGP', items: [firstItem] });
    expect(updated.aggregate).toEqual({ a: 3 });
  });
  it('upgrades legacy schema-v1 buckets', () => {
    const upgraded = upgradeLegacyBucket({ id: 'b1', userId: 'legacy-user', title: 'Old', items: [] }, owner);
    expect(upgraded.ownerId).toBe('legacy-user');
    expect(upgraded.schemaVersion).toBe(2);
    expect(upgraded.visibility).toBe('private');
  });
});
