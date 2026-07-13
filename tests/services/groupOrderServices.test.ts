import { beforeEach, describe, expect, it } from 'vitest';

import { LocalGroupOrderService } from '@/services/groupOrderServices';
import {
  LocalAuthService,
  LocalDataService,
} from '@/services/localServices';
import type { ProfileDefaults, SessionUser } from '@/types/domain';

const defaults: ProfileDefaults = {
  locale: 'en',
  theme: 'system',
  defaultCurrency: 'EGP',
};
const auth = new LocalAuthService();
const data = new LocalDataService();
const groupOrders = new LocalGroupOrderService();

const register = (name: string): Promise<SessionUser> =>
  auth.register(
    name,
    `${name.toLowerCase().replaceAll(' ', '.')}@example.com`,
    'Password1',
    defaults,
  );

const setupSharedBucket = async (owner: SessionUser) => {
  const bucket = await data.createBucket(owner, {
    title: 'Team lunch',
    description: 'Friday order',
    currency: 'EGP',
    items: [
      {
        id: '',
        name: 'Koshary',
        description: '',
        category: 'Meals',
        unitPrice: 50,
        active: true,
      },
    ],
  });
  await groupOrders.enableSharing(owner, bucket.id);
  const shared = await data.getBucket(owner, bucket.id);
  if (!shared) throw new Error('Expected a shared bucket.');
  return shared;
};

describe('local group-order v3 integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('supports custom-item approval, pricing, exact receipts, and automatic freeze', async () => {
    const owner = await register('Owner One');
    const member = await register('Member Two');
    const bucket = await setupSharedBucket(owner);
    const listedItem = bucket.items[0];
    if (!listedItem) throw new Error('Expected a listed item.');

    const { joinCode } = await groupOrders.createInvite(
      owner,
      bucket.id,
      'contributor',
    );
    await groupOrders.acceptJoinCode(member, joinCode);
    await groupOrders.setMemberCustomItemPermissions(owner, bucket.id, member.id, {
      canCreateCustomItems: true,
      canSetCustomItemPrice: false,
    });

    const proposed = await groupOrders.addCustomItem(member, bucket.id, {
      name: 'Fresh juice',
      description: 'No sugar',
      category: 'Drinks',
      unitPrice: 20,
    });
    expect(proposed).toMatchObject({
      source: 'custom',
      approvalStatus: 'pending',
      active: false,
      unitPrice: 0,
      createdByUserId: member.id,
      createdByName: member.displayName,
    });

    const approved = await groupOrders.approveCustomItem(
      owner,
      bucket.id,
      proposed.id,
      20,
    );
    expect(approved).toMatchObject({
      approvalStatus: 'approved',
      active: true,
      unitPrice: 20,
    });

    await groupOrders.updatePricingPolicy(owner, bucket.id, {
      vatBasisPoints: 1000,
      serviceBasisPoints: 500,
      deliveryMinor: 301,
      vatAllocation: 'proportional',
      serviceAllocation: 'proportional',
      deliveryAllocation: 'equal',
    });
    await groupOrders.setContribution(
      owner,
      bucket.id,
      listedItem.id,
      'set',
      1,
      'owner-listed',
    );
    await groupOrders.setContribution(
      member,
      bucket.id,
      listedItem.id,
      'set',
      2,
      'member-listed',
    );
    await groupOrders.setContribution(
      member,
      bucket.id,
      approved.id,
      'set',
      1,
      'member-custom',
    );

    const order = await groupOrders.placeGroupOrder(owner, bucket.id, 'Office lunch');

    expect(order.groupReceipt).toMatchObject({
      itemSubtotalMinor: 17_000,
      vatMinor: 1700,
      serviceMinor: 850,
      deliveryMinor: 301,
      grandTotalMinor: 19_851,
    });
    expect(order.total).toBe(198.51);
    expect(order.groupReceipt?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: approved.id,
          createdByUserId: member.id,
          totalQuantity: 1,
        }),
      ]),
    );

    const storedBucket = await data.getBucket(owner, bucket.id);
    expect(storedBucket?.orderState).toBe('ordered');
    await expect(
      groupOrders.setContribution(
        member,
        bucket.id,
        listedItem.id,
        'set',
        3,
        'post-freeze',
      ),
    ).rejects.toThrow(/frozen/);

    const memberOrder = await data.getOrder(member.id, order.id);
    expect(memberOrder?.userId).toBe(member.id);
    expect(memberOrder?.groupReceipt?.participantReceipts).toHaveLength(1);
    expect(memberOrder?.groupReceipt?.participantReceipts[0]?.userId).toBe(member.id);
    expect(memberOrder?.lines.every((line) => line.quantity > 0)).toBe(true);
  });

  it('allows owner freeze/unfreeze and denies custom items without permission', async () => {
    const owner = await register('Owner One');
    const member = await register('Member Two');
    const bucket = await setupSharedBucket(owner);
    const { joinCode } = await groupOrders.createInvite(
      owner,
      bucket.id,
      'contributor',
    );
    await groupOrders.acceptJoinCode(member, joinCode);

    await expect(
      groupOrders.addCustomItem(member, bucket.id, {
        name: 'Unauthorized item',
        description: '',
        category: '',
        unitPrice: 1,
      }),
    ).rejects.toThrow(/permission/);

    const frozen = await groupOrders.freezeBucket(owner, bucket.id);
    expect(frozen.orderState).toBe('frozen');
    await expect(
      groupOrders.updatePricingPolicy(owner, bucket.id, {
        vatBasisPoints: 0,
        serviceBasisPoints: 0,
        deliveryMinor: 0,
        vatAllocation: 'equal',
        serviceAllocation: 'equal',
        deliveryAllocation: 'equal',
      }),
    ).rejects.toThrow(/frozen/);

    const reopened = await groupOrders.unfreezeBucket(owner, bucket.id);
    expect(reopened).toMatchObject({
      orderState: 'open',
      frozenAt: null,
      frozenBy: null,
    });
  });
});
