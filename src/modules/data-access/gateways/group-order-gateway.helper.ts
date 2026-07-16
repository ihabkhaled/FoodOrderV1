import { createId } from '@/shared/helpers';

import type { CustomItemInput } from '../contracts/group-order-service.interfaces';
import {
  BUCKET_SCHEMA_VERSION,
  DEFAULT_PRICING_POLICY,
  validatePricingPolicy,
} from '../helpers/bucket.helper';
import { calculateGroupOrderReceipt } from '../helpers/group-order.helper';
import { memberCan } from '../helpers/sharing.helper';
import type {
  Bucket,
  BucketContribution,
  BucketItem,
  BucketMember,
  GroupOrderReceiptSnapshot,
  Order,
  SessionUser,
} from '../types/domain.types';

const PERMISSION_ERROR = 'You do not have permission for this action.';

export const normalizeBucket = (bucket: Bucket): Bucket => ({
  ...bucket,
  orderState: bucket.orderState ?? 'open',
  customItemMode: bucket.customItemMode ?? 'proposal',
  pricingPolicy: validatePricingPolicy(
    bucket.pricingPolicy ?? DEFAULT_PRICING_POLICY,
  ),
  frozenAt: bucket.frozenAt ?? null,
  frozenBy: bucket.frozenBy ?? null,
  schemaVersion: Math.max(bucket.schemaVersion, BUCKET_SCHEMA_VERSION),
});

export const assertOwner = (bucket: Bucket, user: SessionUser): void => {
  if (bucket.ownerId !== user.id) throw new Error(PERMISSION_ERROR);
};

export const priceToMinor = (price: number): number => {
  const value = Math.round(price * 100);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError('Item prices must be safe non-negative amounts.');
  }
  return value;
};

export const buildReceipt = (
  rawBucket: Bucket,
  contributions: BucketContribution[],
  bucketRevision: number,
): GroupOrderReceiptSnapshot => {
  const bucket = normalizeBucket(rawBucket);
  const pricingPolicy = validatePricingPolicy(
    bucket.pricingPolicy ?? DEFAULT_PRICING_POLICY,
  );
  const participants = contributions
    .map((contribution) => ({
      userId: contribution.userId,
      displayName: contribution.displayName,
      items: Object.entries(contribution.quantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([itemId, quantity]) => {
          const item = bucket.items.find((candidate) => candidate.id === itemId);
          if (!item) throw new Error('A contribution references a missing item.');

          return {
            itemId,
            itemName: item.name,
            quantity,
            unitPriceMinor: priceToMinor(item.unitPrice),
            createdByUserId: item.createdByUserId ?? bucket.ownerId,
            createdByName: item.createdByName ?? bucket.ownerName,
          };
        }),
    }))
    .filter((participant) => participant.items.length > 0);

  const receipt = calculateGroupOrderReceipt({
    currency: bucket.currency,
    participants,
    policy: pricingPolicy,
  });

  return {
    ...receipt,
    pricingPolicy,
    bucketRevision,
  };
};

export const participantOrder = (order: Order, userId: string): Order => {
  const groupReceipt = order.groupReceipt;
  const receipt = groupReceipt?.participantReceipts.find(
    (candidate) => candidate.userId === userId,
  );
  if (!receipt || !groupReceipt) {
    throw new Error('The participant receipt was not found.');
  }

  return {
    ...order,
    userId,
    lines: receipt.lines.map((line) => ({
      id: createId('line'),
      bucketItemId: line.itemId,
      name: line.itemName,
      quantity: line.quantity,
      unitPrice: line.unitPriceMinor / 100,
      lineTotal: line.lineTotalMinor / 100,
    })),
    subtotal: receipt.itemSubtotalMinor / 100,
    total: receipt.totalMinor / 100,
    participants:
      order.participants?.filter((participant) => participant.userId === userId) ??
      null,
    groupReceipt: {
      ...groupReceipt,
      participantReceipts: [receipt],
      items: groupReceipt.items
        .map((item) => ({
          ...item,
          orderedBy: item.orderedBy.filter(
            (participant) => participant.userId === userId,
          ),
        }))
        .filter((item) => item.orderedBy.length > 0),
    },
  };
};

export const normalizeCustomItem = (
  bucket: Bucket,
  user: SessionUser,
  input: CustomItemInput,
  approved: boolean,
  canSetPrice: boolean,
): BucketItem => {
  const name = input.name.trim();
  if (!name) throw new Error('Custom items require a name.');
  if (name.length > 120) {
    throw new Error('Custom item names are limited to 120 characters.');
  }
  if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0) {
    throw new TypeError('Custom item prices must be valid non-negative numbers.');
  }

  return {
    id: createId('item'),
    name,
    description: input.description.trim().slice(0, 500),
    category: input.category.trim().slice(0, 80),
    unitPrice: canSetPrice ? Math.round(input.unitPrice * 100) / 100 : 0,
    active: approved,
    sortOrder: bucket.items.length,
    createdByUserId: user.id,
    createdByName: user.displayName,
    source: 'custom',
    approvalStatus: approved ? 'approved' : 'pending',
  };
};

export const canCreateCustomItem = (
  rawBucket: Bucket,
  user: SessionUser,
  member: BucketMember | null,
): { approved: boolean; canSetPrice: boolean } => {
  const bucket = normalizeBucket(rawBucket);
  if (bucket.ownerId === user.id) {
    return { approved: true, canSetPrice: true };
  }
  if (!member || !memberCan(member, 'contribute') || !member.canCreateCustomItems) {
    throw new Error(PERMISSION_ERROR);
  }
  if (bucket.customItemMode === 'disabled') {
    throw new Error('Custom items are disabled for this bucket.');
  }

  return {
    approved: bucket.customItemMode === 'direct',
    canSetPrice: member.canSetCustomItemPrice === true,
  };
};
