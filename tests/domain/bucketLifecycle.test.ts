import { describe, expect, it } from 'vitest';

import type { Bucket } from '@/modules/data-access';
import { assertBucketMutable, beginOrdering, completeOrdering, failOrdering, freezeBucket, unfreezeBucket } from '@/modules/data-access';

const openBucket = (): Bucket => ({
  id: 'bucket-1',
  ownerId: 'owner',
  ownerName: 'Owner',
  title: 'Lunch',
  description: '',
  currency: 'EGP',
  visibility: 'shared',
  status: 'active',
  orderState: 'open',
  customItemMode: 'proposal',
  pricingPolicy: {
    vatBasisPoints: 0,
    serviceBasisPoints: 0,
    deliveryMinor: 0,
    vatAllocation: 'proportional',
    serviceAllocation: 'proportional',
    deliveryAllocation: 'equal',
  },
  frozenAt: null,
  frozenBy: null,
  schemaVersion: 3,
  revision: 1,
  items: [],
  aggregate: {},
  createdAt: '2026-07-13T10:00:00.000Z',
  updatedAt: '2026-07-13T10:00:00.000Z',
});

const at = '2026-07-13T11:00:00.000Z';

describe('bucket ordering lifecycle', () => {
  it('freezes an open bucket and rejects later mutations', () => {
    const frozen = freezeBucket(openBucket(), 'owner', at);

    expect(frozen).toMatchObject({
      orderState: 'frozen',
      frozenAt: at,
      frozenBy: 'owner',
      revision: 2,
      updatedAt: at,
    });
    expect(() => {
      assertBucketMutable(frozen);
    }).toThrow(/frozen/);
    expect(freezeBucket(frozen, 'owner', at)).toBe(frozen);
  });

  it('automatically freezes when ordering starts from open state', () => {
    const ordering = beginOrdering(openBucket(), 'owner', at);

    expect(ordering).toMatchObject({
      orderState: 'ordering',
      frozenAt: at,
      frozenBy: 'owner',
      revision: 2,
    });
    expect(beginOrdering(ordering, 'owner', at)).toBe(ordering);
  });

  it('preserves the original freeze attribution when ordering a frozen bucket', () => {
    const frozen = freezeBucket(openBucket(), 'owner', at);
    const ordering = beginOrdering(frozen, 'admin', '2026-07-13T12:00:00.000Z');

    expect(ordering).toMatchObject({
      orderState: 'ordering',
      frozenAt: at,
      frozenBy: 'owner',
      revision: 3,
    });
  });

  it('completes successful ordering and returns failures to frozen state', () => {
    const ordering = beginOrdering(openBucket(), 'owner', at);
    const ordered = completeOrdering(ordering, '2026-07-13T12:00:00.000Z');
    const failed = failOrdering(ordering, '2026-07-13T12:00:00.000Z');

    expect(ordered.orderState).toBe('ordered');
    expect(completeOrdering(ordered)).toBe(ordered);
    expect(failed).toMatchObject({ orderState: 'frozen', frozenBy: 'owner' });
  });

  it('unfreezes only frozen buckets and clears the freeze identity', () => {
    const reopened = unfreezeBucket(freezeBucket(openBucket(), 'owner', at));

    expect(reopened).toMatchObject({
      orderState: 'open',
      frozenAt: null,
      frozenBy: null,
      revision: 3,
    });
    expect(() => unfreezeBucket(openBucket())).toThrow(/Only a frozen/);
  });

  it('rejects invalid transitions and missing actors', () => {
    const bucket = openBucket();

    expect(() => freezeBucket(bucket, '')).toThrow(/actor/);
    expect(() => beginOrdering(bucket, '')).toThrow(/actor/);
    expect(() => completeOrdering(bucket)).toThrow(/being ordered/);
    expect(() => failOrdering(bucket)).toThrow(/being ordered/);
    expect(() => freezeBucket({ ...bucket, orderState: 'ordered' }, 'owner')).toThrow(
      /cannot be frozen/,
    );
    expect(() => beginOrdering({ ...bucket, orderState: 'ordered' }, 'owner')).toThrow(
      /cannot be ordered/,
    );
  });
});
