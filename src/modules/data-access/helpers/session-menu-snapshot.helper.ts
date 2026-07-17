import type {
  Bucket,
  BucketPricingPolicy,
} from '../types/domain.types';
import type { SessionMenuItemSnapshot } from '../types/order-session.types';
import { DEFAULT_PRICING_POLICY } from './bucket.helper';

const assertMinorUnits = (value: number, label: string): number => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer.`);
  }
  return value;
};

const assertBasisPoints = (value: number, label: string): number => {
  if (!Number.isSafeInteger(value) || value < 0 || value > 10_000) {
    throw new Error(`${label} must be an integer between 0 and 10000.`);
  }
  return value;
};

const assertRequiredText = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};

export const validateSessionPricingPolicy = (
  policy: BucketPricingPolicy,
): BucketPricingPolicy => ({
  vatBasisPoints: assertBasisPoints(policy.vatBasisPoints, 'VAT basis points'),
  serviceBasisPoints: assertBasisPoints(
    policy.serviceBasisPoints,
    'Service basis points',
  ),
  deliveryMinor: assertMinorUnits(policy.deliveryMinor, 'Delivery charge'),
  vatAllocation: policy.vatAllocation,
  serviceAllocation: policy.serviceAllocation,
  deliveryAllocation: policy.deliveryAllocation,
});

export const validateSessionMenuItems = (
  items: readonly SessionMenuItemSnapshot[],
): SessionMenuItemSnapshot[] => {
  if (items.length === 0) {
    throw new Error('An order session requires at least one menu item.');
  }
  if (items.length > 50) {
    throw new Error('An order session supports at most 50 menu items.');
  }

  const identifiers = new Set<string>();
  return items
    .map((item) => {
      const id = assertRequiredText(item.id, 'Menu item ID');
      if (identifiers.has(id)) {
        throw new Error(`Menu item identifiers must be unique: ${id}.`);
      }
      identifiers.add(id);
      return {
        id,
        name: assertRequiredText(item.name, 'Menu item name'),
        description: item.description.trim(),
        category: item.category.trim(),
        unitPriceMinor: assertMinorUnits(
          item.unitPriceMinor,
          'Menu item unit price',
        ),
        active: item.active,
        sortOrder: assertMinorUnits(item.sortOrder, 'Menu item sort order'),
        createdByUserId: item.createdByUserId?.trim() || null,
        createdByName: item.createdByName?.trim() || null,
        source: item.source,
      };
    })
    .toSorted((left, right) => left.sortOrder - right.sortOrder);
};

export const createSessionMenuSnapshot = (
  bucket: Bucket,
): {
  menuItems: SessionMenuItemSnapshot[];
  pricingPolicy: BucketPricingPolicy;
} => ({
  menuItems: validateSessionMenuItems(
    bucket.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      unitPriceMinor: Math.round(item.unitPrice * 100),
      active: item.active && item.approvalStatus !== 'pending',
      sortOrder: item.sortOrder,
      createdByUserId: item.createdByUserId ?? null,
      createdByName: item.createdByName ?? null,
      source: item.source ?? 'catalog',
    })),
  ),
  pricingPolicy: validateSessionPricingPolicy(
    bucket.pricingPolicy ?? DEFAULT_PRICING_POLICY,
  ),
});
