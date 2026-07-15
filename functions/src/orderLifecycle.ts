export type GroupOrderStatus = 'draft' | 'placed' | 'completed' | 'cancelled';

export interface GroupOrderDocument {
  id: string;
  userId: string;
  bucketId: string;
  bucketTitle: string;
  status: GroupOrderStatus;
  groupReceipt: unknown;
  createdAt: string;
  updatedAt: string;
  placedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  [key: string]: unknown;
}

export interface GroupOrderTransitionPatch {
  status: GroupOrderStatus;
  updatedAt: string;
  placedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

const transitions: Record<GroupOrderStatus, GroupOrderStatus[]> = {
  draft: ['placed', 'completed', 'cancelled'],
  placed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const assertGroupOrderDocument = (
  order: GroupOrderDocument,
): void => {
  if (!order.groupReceipt) {
    throw new Error('This action requires a group order.');
  }
};

export const buildGroupOrderTransitionPatch = (
  current: GroupOrderStatus,
  target: GroupOrderStatus,
  timestamp: string,
): GroupOrderTransitionPatch => {
  if (current === target) return { status: target, updatedAt: timestamp };
  if (!transitions[current].includes(target)) {
    throw new Error(`Order cannot move from ${current} to ${target}.`);
  }

  return {
    status: target,
    updatedAt: timestamp,
    ...(target === 'placed' ? { placedAt: timestamp } : {}),
    ...(target === 'completed' ? { completedAt: timestamp } : {}),
    ...(target === 'cancelled' ? { cancelledAt: timestamp } : {}),
  };
};

export const repeatGroupOrderDocument = (
  source: GroupOrderDocument,
  userId: string,
  orderId: string,
  timestamp: string,
): GroupOrderDocument => {
  assertGroupOrderDocument(source);
  const repeated = structuredClone(source);
  delete repeated.placedById;
  delete repeated.placedByName;

  return {
    ...repeated,
    id: orderId,
    userId,
    // Preserve the exact source name. Repeated orders never append "(copy)".
    bucketTitle: source.bucketTitle,
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
    placedAt: null,
    completedAt: null,
    cancelledAt: null,
    repeatedFromOrderId: source.id,
  };
};
