import { describe, expect, it } from 'vitest';

import {
  buildDuplicateBucketDraft,
  createBucket,
  updateBucket,
} from '@/lib/bucket';
import { buildPersonalOrderReceipt, createOrder } from '@/lib/order';
import type {
  Bucket,
  BucketDraft,
  BucketPricingPolicy,
  SessionUser,
} from '@/types/domain';

const user: SessionUser = {
  id: 'owner-1',
  email: 'owner@example.com',
  displayName: 'Owner',
  isDemo: true,
};

const pricingPolicy: BucketPricingPolicy = {
  vatBasisPoints: 1400,
  serviceBasisPoints: 1200,
  deliveryMinor: 2500,
  vatAllocation: 'proportional',
  serviceAllocation: 'proportional',
  deliveryAllocation: 'equal',
};

const draft = (policy = pricingPolicy): BucketDraft => ({
  title: 'Bashandy',
  description: 'Private breakfast bucket',
  currency: 'EGP',
  pricingPolicy: policy,
  items: [
    {
      id: 'item-1',
      name: 'Fool',
      description: '',
      category: 'Breakfast',
      unitPrice: 10,
      active: true,
      sortOrder: 0,
    },
    {
      id: 'item-2',
      name: 'Ta3mya',
      description: '',
      category: 'Breakfast',
      unitPrice: 5,
      active: true,
      sortOrder: 1,
    },
  ],
});

const privateBucket = (): Bucket =>
  createBucket({ id: user.id, displayName: user.displayName }, draft());

describe('bucket-owned pricing', () => {
  it('persists VAT, service, and delivery on private bucket creation and edit', () => {
    const created = privateBucket();
    expect(created.visibility).toBe('private');
    expect(created.pricingPolicy).toEqual(pricingPolicy);

    const updatedPolicy: BucketPricingPolicy = {
      ...pricingPolicy,
      vatBasisPoints: 1000,
      serviceBasisPoints: 500,
      deliveryMinor: 1500,
    };
    const updated = updateBucket(created, draft(updatedPolicy));

    expect(updated.pricingPolicy).toEqual(updatedPolicy);
    expect(updated.revision).toBe(created.revision + 1);
  });

  it('copies the complete pricing policy when duplicating a bucket', () => {
    const bucket = privateBucket();
    const duplicate = buildDuplicateBucketDraft(bucket, 'copy');

    expect(duplicate.pricingPolicy).toEqual(pricingPolicy);
    expect(duplicate.pricingPolicy).not.toBe(bucket.pricingPolicy);
    expect(duplicate.customItemMode).toBe(bucket.customItemMode);
    expect(duplicate.items).toHaveLength(bucket.items.length);
  });

  it('applies private bucket charges to a single-person order snapshot', () => {
    const bucket = privateBucket();
    const lines = [
      {
        id: 'line-1',
        bucketItemId: 'item-1',
        name: 'Fool',
        quantity: 2,
        unitPrice: 10,
      },
      {
        id: 'line-2',
        bucketItemId: 'item-2',
        name: 'Ta3mya',
        quantity: 3,
        unitPrice: 5,
      },
    ];
    const receipt = buildPersonalOrderReceipt(bucket, user, lines);

    expect(receipt).toMatchObject({
      itemSubtotalMinor: 3500,
      vatMinor: 490,
      serviceMinor: 420,
      deliveryMinor: 2500,
      grandTotalMinor: 6910,
      pricingPolicy,
      bucketRevision: bucket.revision,
    });
    expect(receipt.participantReceipts).toHaveLength(1);

    const order = createOrder(user.id, {
      bucketId: bucket.id,
      bucketTitle: bucket.title,
      currency: bucket.currency,
      lines,
      notes: '',
      status: 'placed',
      sourceBucketRevision: bucket.revision,
      groupReceipt: receipt,
    });

    expect(order.subtotal).toBe(35);
    expect(order.total).toBe(69.1);
    expect(order.participants).toBeNull();
  });
});
