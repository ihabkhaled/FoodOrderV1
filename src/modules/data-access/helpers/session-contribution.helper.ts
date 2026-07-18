import type { BucketPricingPolicy } from '../types/domain.types';
import type {
  SessionContribution,
  SessionContributionMutationInput,
  SessionContributionMutationRecord,
  SessionMenuItemSnapshot,
} from '../types/order-session.types';
import { MAX_ORDER_QUANTITY } from './bucket.helper';
import { calculateBasisPointCharge } from './group-order.helper';

export interface SessionContributionMutationState {
  contribution: SessionContribution | null;
  appliedMutation: SessionContributionMutationRecord | null;
}

export interface SessionContributionMutationResult {
  contribution: SessionContribution;
  record: SessionContributionMutationRecord;
  alreadyApplied: boolean;
}

export interface SessionPricingSnapshot {
  menuItems: readonly SessionMenuItemSnapshot[];
  pricingPolicy: BucketPricingPolicy;
}

const validateQuantity = (value: number): number => {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_ORDER_QUANTITY) {
    throw new Error(
      `Quantity must be a whole number between 0 and ${MAX_ORDER_QUANTITY}.`,
    );
  }
  return value;
};

const validateAggregateQuantity = (value: number): number => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('Aggregate quantity must be a non-negative safe integer.');
  }
  return value;
};

const toSafeNumber = (value: bigint, label: string): number => {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) {
    throw new TypeError(`${label} exceeds the supported money range.`);
  }
  return result;
};

const omitQuantity = (
  quantities: Readonly<Record<string, number>>,
  itemId: string,
): Record<string, number> => {
  const { [itemId]: _omitted, ...remaining } = quantities;
  return remaining;
};

export const applySessionContributionMutation = (
  state: SessionContributionMutationState,
  input: SessionContributionMutationInput,
): SessionContributionMutationResult => {
  if (state.appliedMutation) {
    if (!state.contribution) {
      throw new Error('Mutation record exists without a session contribution.');
    }
    return {
      contribution: state.contribution,
      record: state.appliedMutation,
      alreadyApplied: true,
    };
  }

  if (Number.isNaN(Date.parse(input.occurredAt))) {
    throw new Error('Contribution time must be a valid ISO timestamp.');
  }
  const sessionId = input.sessionId.trim();
  const userId = input.userId.trim();
  const displayName = input.displayName.trim();
  const itemId = input.itemId.trim();
  const mutationId = input.mutationId.trim();
  if (!sessionId || !userId || !displayName || !itemId || !mutationId) {
    throw new Error('Contribution identifiers and display name are required.');
  }

  const current = state.contribution?.quantities[itemId] ?? 0;
  const target =
    input.operation === 'set' ? input.value : current + input.value;
  validateQuantity(target);
  const delta = target - current;
  const currentQuantities = state.contribution?.quantities ?? {};
  const quantities =
    target === 0
      ? omitQuantity(currentQuantities, itemId)
      : { ...currentQuantities, [itemId]: target };
  const contributionRevision = (state.contribution?.revision ?? 0) + 1;
  const contribution: SessionContribution = {
    sessionId,
    userId,
    displayName,
    quantities,
    revision: contributionRevision,
    lastMutationId: mutationId,
    updatedAt: input.occurredAt,
  };
  const record: SessionContributionMutationRecord = {
    id: mutationId,
    sessionId,
    userId,
    itemId,
    operation: input.operation,
    requestedValue: input.value,
    appliedDelta: delta,
    resultQuantity: target,
    resultRevision: contributionRevision,
    createdAt: input.occurredAt,
  };

  return { contribution, record, alreadyApplied: false };
};

export const computeSessionAggregate = (
  contributions: readonly SessionContribution[],
): Record<string, number> => {
  const aggregate: Record<string, number> = {};
  for (const contribution of contributions) {
    for (const [itemId, quantity] of Object.entries(contribution.quantities)) {
      if (quantity <= 0) continue;
      aggregate[itemId] = (aggregate[itemId] ?? 0) + quantity;
    }
  }
  return aggregate;
};

export const calculateSessionExpectedGrandTotalMinor = (
  snapshot: SessionPricingSnapshot,
  aggregate: Readonly<Record<string, number>>,
): number => {
  const menuItems = new Map(
    snapshot.menuItems.map((item) => [item.id, item] as const),
  );
  let itemSubtotalMinor = 0n;

  for (const [itemId, quantityValue] of Object.entries(aggregate)) {
    const quantity = validateAggregateQuantity(quantityValue);
    if (quantity === 0) continue;
    const item = menuItems.get(itemId);
    if (!item?.active) {
      throw new Error(`Aggregate references an unavailable menu item: ${itemId}.`);
    }
    const lineTotal = BigInt(quantity) * BigInt(item.unitPriceMinor);
    itemSubtotalMinor += lineTotal;
    toSafeNumber(lineTotal, 'Line total');
    toSafeNumber(itemSubtotalMinor, 'Item subtotal');
  }

  const subtotal = toSafeNumber(itemSubtotalMinor, 'Item subtotal');
  const vatMinor = calculateBasisPointCharge(
    subtotal,
    snapshot.pricingPolicy.vatBasisPoints,
  );
  const serviceMinor = calculateBasisPointCharge(
    subtotal,
    snapshot.pricingPolicy.serviceBasisPoints,
  );
  return toSafeNumber(
    BigInt(subtotal) +
      BigInt(vatMinor) +
      BigInt(serviceMinor) +
      BigInt(snapshot.pricingPolicy.deliveryMinor),
    'Session grand total',
  );
};
