const transitions = {
    draft: ['placed', 'completed', 'cancelled'],
    placed: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
};
export const assertGroupOrderDocument = (order) => {
    if (!order.groupReceipt) {
        throw new Error('This action requires a group order.');
    }
};
export const buildGroupOrderTransitionPatch = (current, target, timestamp) => {
    if (current === target)
        return { status: target, updatedAt: timestamp };
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
export const repeatGroupOrderDocument = (source, userId, orderId, timestamp) => {
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
