import { describe, expect, it, vi } from 'vitest';

import type { DataService, SharingService } from '@/services/contracts';
import { LocalPaginationService } from '@/services/paginationServices';
import type { Bucket, Order, SessionUser } from '@/types/domain';

const user: SessionUser = {
  id: 'user-1',
  email: 'user@example.com',
  displayName: 'User',
  isDemo: false,
};

const bucket = (id: string, updatedAt: string): Bucket => ({
  id,
  ownerId: user.id,
  ownerName: user.displayName,
  title: id,
  description: '',
  currency: 'EGP',
  items: [
    {
      id: `${id}-item`,
      name: 'Meal',
      description: '',
      category: 'Main',
      unitPrice: 10,
      active: true,
      sortOrder: 0,
    },
  ],
  visibility: 'private',
  status: 'active',
  schemaVersion: 3,
  revision: 1,
  aggregate: { [`${id}-item`]: 0 },
  orderState: 'open',
  pricingPolicy: {
    vatBasisPoints: 0,
    serviceBasisPoints: 0,
    deliveryMinor: 0,
    vatAllocation: 'proportional',
    serviceAllocation: 'proportional',
    deliveryAllocation: 'equal',
  },
  customItemMode: 'disabled',
  frozenAt: null,
  frozenBy: null,
  createdAt: updatedAt,
  updatedAt,
});

const order = (id: string, createdAt: string): Order => ({
  id,
  userId: user.id,
  bucketId: '',
  bucketTitle: id,
  currency: 'EGP',
  status: 'draft',
  notes: '',
  lines: [
    {
      id: `${id}-line`,
      bucketItemId: `${id}-item`,
      name: 'Meal',
      unitPrice: 10,
      quantity: 1,
      lineTotal: 10,
    },
  ],
  subtotal: 10,
  total: 10,
  sourceBucketRevision: null,
  participants: null,
  createdAt,
  updatedAt: createdAt,
  placedAt: null,
  completedAt: null,
  cancelledAt: null,
});

const data = {
  listBuckets: vi.fn(() =>
    Promise.resolve([
      bucket('old', '2026-01-01T00:00:00.000Z'),
      bucket('new', '2026-01-03T00:00:00.000Z'),
      bucket('middle', '2026-01-02T00:00:00.000Z'),
    ]),
  ),
  listOrders: vi.fn(() =>
    Promise.resolve([
      order('old-order', '2026-01-01T00:00:00.000Z'),
      order('new-order', '2026-01-03T00:00:00.000Z'),
    ]),
  ),
} as unknown as DataService;

const sharing = {
  listSharedWithMe: vi.fn(() =>
    Promise.resolve([
      bucket('shared-old', '2026-01-01T00:00:00.000Z'),
      bucket('shared-new', '2026-01-03T00:00:00.000Z'),
    ]),
  ),
} as unknown as SharingService;

describe('LocalPaginationService', () => {
  const service = new LocalPaginationService(data, sharing);

  it('pages owned buckets using the same deterministic cursor contract', async () => {
    const first = await service.listOwnedBuckets(user, { limit: 2 });
    expect(first.items.map(({ id }) => id)).toEqual(['new', 'middle']);
    expect(first.hasMore).toBe(true);
    if (!first.nextCursor) throw new Error('Expected the first page cursor.');

    const second = await service.listOwnedBuckets(user, {
      limit: 2,
      cursor: first.nextCursor,
    });
    expect(second.items.map(({ id }) => id)).toEqual(['old']);
    expect(second.hasMore).toBe(false);
  });

  it('pages shared buckets and orders independently', async () => {
    const [sharedPage, orderPage] = await Promise.all([
      service.listSharedBuckets(user, { limit: 1 }),
      service.listOrders(user, { limit: 1 }),
    ]);
    expect(sharedPage.items[0]?.id).toBe('shared-new');
    expect(orderPage.items[0]?.id).toBe('new-order');
    expect(sharedPage.hasMore).toBe(true);
    expect(orderPage.hasMore).toBe(true);
  });
});
