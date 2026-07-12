import { MAX_ORDER_QUANTITY } from '@/lib/bucket';
import { nowIso } from '@/lib/date';
import { createId } from '@/lib/id';
import { roundMoney } from '@/lib/money';
import type { Order, OrderDraft, OrderLine, OrderStatus } from '@/types/domain';

export const calculateLineTotal = (quantity: number, unitPrice: number): number =>
  roundMoney(quantity * unitPrice);

export const calculateOrderTotal = (lines: Pick<OrderLine, 'quantity' | 'unitPrice'>[]): number =>
  roundMoney(lines.reduce((total, line) => total + calculateLineTotal(line.quantity, line.unitPrice), 0));

export const normalizeOrderLines = (lines: OrderDraft['lines']): OrderLine[] => {
  if (lines.some((line) => !Number.isInteger(line.quantity) || line.quantity < 0 || line.quantity > MAX_ORDER_QUANTITY)) {
    throw new Error(`Item quantity must be a whole number between 0 and ${MAX_ORDER_QUANTITY}.`);
  }
  if (lines.some((line) => !Number.isFinite(line.unitPrice) || line.unitPrice < 0)) {
    throw new Error('Item prices must be valid non-negative numbers.');
  }
  if (lines.some((line) => line.quantity > 0 && !line.name.trim())) throw new Error('Every selected item requires a name.');
  return lines
    .filter((line) => line.quantity > 0)
    .map((line) => ({ ...line, name: line.name.trim(), lineTotal: calculateLineTotal(line.quantity, line.unitPrice) }));
};

export const createOrder = (userId: string, draft: OrderDraft): Order => {
  if (!draft.bucketId.trim() || !draft.bucketTitle.trim()) throw new Error('Order bucket information is required.');
  if (draft.notes.length > 500) throw new Error('Order notes support up to 500 characters.');
  const lines = normalizeOrderLines(draft.lines);
  if (lines.length === 0) throw new Error('An order requires at least one selected item.');
  const createdAt = nowIso();
  const status = draft.status ?? 'placed';
  const subtotal = calculateOrderTotal(lines);
  return {
    id: createId('order'),
    userId,
    bucketId: draft.bucketId,
    bucketTitle: draft.bucketTitle.trim(),
    status,
    currency: draft.currency,
    lines,
    notes: draft.notes.trim(),
    subtotal,
    total: subtotal,
    createdAt,
    updatedAt: createdAt,
    placedAt: status === 'placed' ? createdAt : null,
    completedAt: null,
    cancelledAt: status === 'cancelled' ? createdAt : null,
  };
};

const transitions: Record<OrderStatus, OrderStatus[]> = {
  draft: ['placed', 'cancelled'],
  placed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
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
    placedAt: status === 'placed' ? order.placedAt ?? updatedAt : order.placedAt,
    completedAt: status === 'completed' ? updatedAt : order.completedAt,
    cancelledAt: status === 'cancelled' ? updatedAt : order.cancelledAt,
  };
};
