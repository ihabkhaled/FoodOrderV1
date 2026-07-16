import { describe, expect, it } from 'vitest';

import { createBucket, MAX_BUCKET_ITEMS, normalizeBucketItems, updateBucket, upgradeLegacyBucket } from '@/modules/data-access';

const owner = { id: 'u', displayName: 'User' };

describe('bucket domain', () => {
  it('normalizes a valid schema-v3 bucket', () => {
    const bucket = createBucket(owner, {
      title: ' Breakfast ',
      description: ' Friday ',
      currency: 'EGP',
      items: [
        {
          id: '',
          name: ' Foul ',
          description: '',
          category: 'Egyptian',
          unitPrice: 12.345,
          active: true,
        },
      ],
    });

    expect(bucket).toMatchObject({
      title: 'Breakfast',
      ownerId: 'u',
      visibility: 'private',
      schemaVersion: 3,
      revision: 1,
      aggregate: {},
      orderState: 'open',
      customItemMode: 'proposal',
      frozenAt: null,
      frozenBy: null,
      pricingPolicy: {
        vatBasisPoints: 0,
        serviceBasisPoints: 0,
        deliveryMinor: 0,
        vatAllocation: 'proportional',
        serviceAllocation: 'proportional',
        deliveryAllocation: 'equal',
      },
    });
    expect(bucket.items[0]).toMatchObject({
      unitPrice: 12.35,
      createdByUserId: 'u',
      createdByName: 'User',
      source: 'catalog',
      approvalStatus: 'approved',
    });
  });

  it('rejects invalid item collections', () => {
    expect(() => normalizeBucketItems([])).toThrow(/at least one/);
    expect(() =>
      normalizeBucketItems([
        {
          id: 'x',
          name: ' ',
          description: '',
          category: '',
          unitPrice: 0,
          active: true,
        },
      ]),
    ).toThrow(/name/);
    expect(() =>
      normalizeBucketItems(
        Array.from({ length: MAX_BUCKET_ITEMS + 1 }, (_, index) => ({
          id: `${index}`,
          name: `Item ${index}`,
          description: '',
          category: '',
          unitPrice: 1,
          active: true,
        })),
      ),
    ).toThrow(/supports up to/);
  });

  it('preserves identity and bumps revision on update', () => {
    const bucket = createBucket(owner, {
      title: 'Old',
      description: '',
      currency: 'EGP',
      items: [
        {
          id: 'i',
          name: 'Tea',
          description: '',
          category: '',
          unitPrice: 10,
          active: true,
        },
      ],
    });
    const updated = updateBucket(bucket, {
      title: 'New',
      description: '',
      currency: 'USD',
      items: bucket.items,
    });

    expect(updated.id).toBe(bucket.id);
    expect(updated.revision).toBe(bucket.revision + 1);
  });

  it('drops deleted items from the aggregate on update', () => {
    const bucket = {
      ...createBucket(owner, {
        title: 'T',
        description: '',
        currency: 'EGP',
        items: [
          {
            id: 'a',
            name: 'A',
            description: '',
            category: '',
            unitPrice: 1,
            active: true,
          },
          {
            id: 'b',
            name: 'B',
            description: '',
            category: '',
            unitPrice: 2,
            active: true,
          },
        ],
      }),
      aggregate: { a: 3, b: 2 },
    };
    const [firstItem] = bucket.items;
    if (!firstItem) throw new Error('expected an item');
    const updated = updateBucket(bucket, {
      title: 'T',
      description: '',
      currency: 'EGP',
      items: [firstItem],
    });

    expect(updated.aggregate).toEqual({ a: 3 });
  });

  it('upgrades legacy schema-v1 buckets without inventing charges', () => {
    const upgraded = upgradeLegacyBucket(
      { id: 'b1', userId: 'legacy-user', title: 'Old', items: [] },
      owner,
    );

    expect(upgraded).toMatchObject({
      ownerId: 'legacy-user',
      schemaVersion: 3,
      visibility: 'private',
      orderState: 'open',
      pricingPolicy: {
        vatBasisPoints: 0,
        serviceBasisPoints: 0,
        deliveryMinor: 0,
      },
    });
  });
});
