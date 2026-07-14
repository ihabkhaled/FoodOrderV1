import { nowIso } from '@/lib/date';
import { createId } from '@/lib/id';
import { roundMoney } from '@/lib/money';
import type { Order, OrderDraft, OrderLine, OrderStatus } from '@/types/domain';

const transitions: Record<OrderStatus, OrderStatus[]> = {
  draft: ['placed', 'completed', 'cancelled'],
  placed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export interface OrderChargeBreakdown {
  vat: number;
  service: number;
  delivery: number;
}

export const normalizeOrderLines = (lines: OrderDraft['lines']): OrderLine[] =>
  lines
    .filter((line) => line.quantity > 0)
    .map((line) => ({
      ...line,
      quantity: Math.floor(line.quantity),
      unitPrice: roundMoney(line.unitPrice),
      lineTotal: calculateLineTotal(line.quantity, line.unitPrice),
    }));

export const calculateLineTotal = (quantity: number, unitPrice: number): number =>
  roundMoney(quantity * unitPrice);

export const calculateOrderTotal = (
  lines: Pick<OrderLine, 'quantity' | 'unitPrice'>[],
): number => roundMoney(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));

export const createOrder = (userId: string, draft: OrderDraft): Order => {
  const lines = normalizeOrderLines(draft.lines);
  if (lines.length === 0) throw new Error('Choose at least one item.');
  const createdAt = nowIso();
  const status = draft.status ?? 'draft';
  const subtotal = calculateOrderTotal(lines);

  return {
    id: createId('order'),
    userId,
    bucketId: draft.bucketId,
    bucketTitle: draft.bucketTitle,
    status,
    currency: draft.currency,
    lines,
    notes: draft.notes.trim(),
    subtotal,
    total: draft.groupReceipt
      ? roundMoney(draft.groupReceipt.grandTotalMinor / 100)
      : subtotal,
    sourceBucketRevision: draft.sourceBucketRevision ?? null,
    participants: draft.participants ? structuredClone(draft.participants) : null,
    groupReceipt: draft.groupReceipt ? structuredClone(draft.groupReceipt) : null,
    createdAt,
    updatedAt: createdAt,
    placedAt: status === 'placed' ? createdAt : null,
    completedAt: status === 'completed' ? createdAt : null,
    cancelledAt: status === 'cancelled' ? createdAt : null,
  };
};

export const buildRepeatedOrderDraft = (order: Order): OrderDraft => ({
  bucketId: order.bucketId,
  // Repeating an order preserves the exact original name; no "(copy)" suffix is added.
  bucketTitle: order.bucketTitle,
  currency: order.currency,
  lines: order.lines.map(({ id, bucketItemId, name, quantity, unitPrice }) => ({
    id,
    bucketItemId,
    name,
    quantity,
    unitPrice,
  })),
  notes: order.notes,
  status: 'draft',
  sourceBucketRevision: order.sourceBucketRevision,
  participants: order.participants ? structuredClone(order.participants) : null,
  groupReceipt: order.groupReceipt ? structuredClone(order.groupReceipt) : null,
});

export const getOrderChargeBreakdown = (
  order: Order,
): OrderChargeBreakdown | null => {
  const receipt = order.groupReceipt;
  if (!receipt) return null;

  const globalTotal = roundMoney(receipt.grandTotalMinor / 100);
  const participantReceipt = receipt.participantReceipts.find(
    (participant) => participant.userId === order.userId,
  );
  const isParticipantCopy =
    participantReceipt !== undefined && Math.abs(globalTotal - order.total) >= 0.005;

  if (isParticipantCopy) {
    return {
      vat: roundMoney(participantReceipt.vatShareMinor / 100),
      service: roundMoney(participantReceipt.serviceShareMinor / 100),
      delivery: roundMoney(participantReceipt.deliveryShareMinor / 100),
    };
  }

  return {
    vat: roundMoney(receipt.vatMinor / 100),
    service: roundMoney(receipt.serviceMinor / 100),
    delivery: roundMoney(receipt.deliveryMinor / 100),
  };
};

export const canTransitionOrder = (from: OrderStatus, to: OrderStatus): boolean =>
  transitions[from].includes(to);

export const transitionOrder = (order: Order, status: OrderStatus): Order => {
  if (order.status === status) return order;
  if (!canTransitionOrder(order.status, status)) {
    throw new Error(`Order cannot move from ${order.status} to ${status}.`);
  }
  const updatedAt = nowIso();

  return {
    ...order,
    status,
    updatedAt,
    placedAt: status === 'placed' ? updatedAt : order.placedAt,
    completedAt: status === 'completed' ? updatedAt : order.completedAt,
    cancelledAt: status === 'cancelled' ? updatedAt : order.cancelledAt,
  };
};
