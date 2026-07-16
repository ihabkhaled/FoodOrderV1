import { randomUUID } from 'node:crypto';
import { calculateGroupOrderReceipt, } from '../../packages/group-order-engine/src/index.js';
export class OrderValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'OrderValidationError';
    }
}
const CURRENCIES = new Set([
    'EGP',
    'USD',
    'EUR',
    'GBP',
    'SAR',
    'AED',
]);
const ALLOCATIONS = new Set(['equal', 'proportional']);
const text = (value, fallback) => typeof value === 'string' && value.trim() ? value.trim() : fallback;
const whole = (value, fallback = 0) => typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : fallback;
const pricingPolicy = (value) => ({
    vatBasisPoints: Math.min(10_000, whole(value?.vatBasisPoints)),
    serviceBasisPoints: Math.min(10_000, whole(value?.serviceBasisPoints)),
    deliveryMinor: whole(value?.deliveryMinor),
    vatAllocation: ALLOCATIONS.has(value?.vatAllocation ?? '')
        ? value?.vatAllocation
        : 'proportional',
    serviceAllocation: ALLOCATIONS.has(value?.serviceAllocation ?? '')
        ? value?.serviceAllocation
        : 'proportional',
    deliveryAllocation: ALLOCATIONS.has(value?.deliveryAllocation ?? '')
        ? value?.deliveryAllocation
        : 'equal',
});
const currency = (value) => typeof value === 'string' && CURRENCIES.has(value)
    ? value
    : 'EGP';
const quantity = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.max(1, Math.trunc(value))
    : 0;
const priceMinor = (value) => {
    const price = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    const minor = Math.round(Math.max(0, price) * 100);
    if (!Number.isSafeInteger(minor)) {
        throw new OrderValidationError('An item has a price outside the supported range.');
    }
    return minor;
};
const mergeContributions = (contributions, availableIds) => {
    const merged = new Map();
    for (const raw of contributions) {
        const userId = text(raw.userId, '');
        if (!userId)
            continue;
        const existing = merged.get(userId) ?? {
            userId,
            displayName: text(raw.displayName, 'Participant'),
            quantities: {},
        };
        for (const [itemId, rawQuantity] of Object.entries(raw.quantities ?? {})) {
            if (!availableIds.has(itemId))
                continue;
            const normalized = quantity(rawQuantity);
            if (normalized > 0)
                existing.quantities[itemId] = normalized;
        }
        if (Object.keys(existing.quantities).length > 0)
            merged.set(userId, existing);
    }
    return merged;
};
const ownerFallbackContribution = (bucket, availableIds) => {
    const quantities = {};
    for (const [itemId, rawQuantity] of Object.entries(bucket.aggregate ?? {})) {
        if (!availableIds.has(itemId))
            continue;
        const normalized = quantity(rawQuantity);
        if (normalized > 0)
            quantities[itemId] = normalized;
    }
    return Object.keys(quantities).length === 0
        ? null
        : {
            userId: bucket.ownerId,
            displayName: text(bucket.ownerName, 'Bucket owner'),
            quantities,
        };
};
export const buildOrderSnapshot = (bucket, rawContributions, ownerId, notes, orderId, timestamp) => {
    const ownerName = text(bucket.ownerName, 'Bucket owner');
    const items = (bucket.items ?? [])
        .filter((item) => item.active !== false && item.approvalStatus !== 'pending')
        .map((item) => ({
        ...item,
        id: text(item.id, ''),
        name: text(item.name, 'Custom item'),
        createdByUserId: text(item.createdByUserId, bucket.ownerId),
        createdByName: text(item.createdByName, ownerName),
        unitPrice: Math.max(0, typeof item.unitPrice === 'number' && Number.isFinite(item.unitPrice)
            ? item.unitPrice
            : 0),
    }))
        .filter((item) => item.id);
    const itemsById = new Map(items.map((item) => [item.id, item]));
    const availableIds = new Set(itemsById.keys());
    const fallback = ownerFallbackContribution(bucket, availableIds);
    const contributions = rawContributions.length === 0 && fallback ? [fallback] : rawContributions;
    const merged = mergeContributions(contributions, availableIds);
    if (merged.size === 0 && fallback) {
        for (const [key, value] of mergeContributions([fallback], availableIds)) {
            merged.set(key, value);
        }
    }
    const participants = [...merged.values()];
    if (participants.length === 0) {
        throw new OrderValidationError('Choose at least one available item before placing the order.');
    }
    const receiptParticipants = participants.map((participant) => ({
        userId: participant.userId,
        displayName: participant.displayName,
        items: Object.entries(participant.quantities).map(([itemId, itemQuantity]) => {
            const item = itemsById.get(itemId);
            if (!item) {
                throw new OrderValidationError('An order item is no longer available.');
            }
            return {
                itemId,
                itemName: item.name,
                quantity: itemQuantity,
                unitPriceMinor: priceMinor(item.unitPrice),
                createdByUserId: item.createdByUserId,
                createdByName: item.createdByName,
            };
        }),
    }));
    const policy = pricingPolicy(bucket.pricingPolicy);
    let receipt;
    try {
        receipt = calculateGroupOrderReceipt({
            currency: currency(bucket.currency),
            participants: receiptParticipants,
            policy,
        });
    }
    catch (error) {
        throw new OrderValidationError(error instanceof Error
            ? error.message
            : 'The receipt could not be calculated.');
    }
    const aggregate = {};
    for (const participant of participants) {
        for (const [itemId, itemQuantity] of Object.entries(participant.quantities)) {
            aggregate[itemId] = (aggregate[itemId] ?? 0) + itemQuantity;
        }
    }
    const revision = Math.max(1, whole(bucket.revision, 1)) + 1;
    const lines = items
        .filter((item) => (aggregate[item.id] ?? 0) > 0)
        .map((item) => ({
        id: randomUUID(),
        bucketItemId: item.id,
        name: item.name,
        quantity: aggregate[item.id] ?? 0,
        unitPrice: item.unitPrice,
        lineTotal: Math.round((aggregate[item.id] ?? 0) * item.unitPrice * 100) / 100,
    }));
    const order = {
        id: orderId,
        userId: ownerId,
        bucketId: bucket.id,
        bucketTitle: text(bucket.title, 'Group order'),
        status: 'placed',
        currency: currency(bucket.currency),
        lines,
        notes,
        subtotal: receipt.itemSubtotalMinor / 100,
        total: receipt.grandTotalMinor / 100,
        sourceBucketRevision: revision,
        participants,
        groupReceipt: {
            ...receipt,
            pricingPolicy: policy,
            bucketRevision: revision,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
        placedAt: timestamp,
        completedAt: null,
        cancelledAt: null,
    };
    return { order, aggregate };
};
export const participantOrder = (order, participantId) => {
    const receipt = order.groupReceipt.participantReceipts.find((candidate) => candidate.userId === participantId);
    if (!receipt) {
        throw new OrderValidationError('A participant receipt could not be generated.');
    }
    return {
        ...order,
        userId: participantId,
        lines: receipt.lines.map((line) => ({
            id: randomUUID(),
            bucketItemId: line.itemId,
            name: line.itemName,
            quantity: line.quantity,
            unitPrice: line.unitPriceMinor / 100,
            lineTotal: line.lineTotalMinor / 100,
        })),
        subtotal: receipt.itemSubtotalMinor / 100,
        total: receipt.totalMinor / 100,
        participants: order.participants.filter((participant) => participant.userId === participantId),
        groupReceipt: {
            ...order.groupReceipt,
            participantReceipts: [receipt],
            items: order.groupReceipt.items
                .map((item) => ({
                ...item,
                orderedBy: item.orderedBy.filter((participant) => participant.userId === participantId),
            }))
                .filter((item) => item.orderedBy.length > 0),
        },
    };
};
