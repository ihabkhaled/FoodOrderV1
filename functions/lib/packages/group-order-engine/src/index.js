const BASIS_POINTS_DIVISOR = 10000n;
const assertSafeNonNegativeInteger = (value, label) => {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(`${label} must be a non-negative safe integer.`);
    }
};
const toSafeNumber = (value, label) => {
    const result = Number(value);
    if (!Number.isSafeInteger(result)) {
        throw new TypeError(`${label} exceeds the supported money range.`);
    }
    return result;
};
export const calculateBasisPointCharge = (amountMinor, basisPoints) => {
    assertSafeNonNegativeInteger(amountMinor, 'Charge base');
    assertSafeNonNegativeInteger(basisPoints, 'Basis points');
    const numerator = BigInt(amountMinor) * BigInt(basisPoints);
    const rounded = (numerator + BASIS_POINTS_DIVISOR / 2n) / BASIS_POINTS_DIVISOR;
    return toSafeNumber(rounded, 'Calculated charge');
};
export const allocateMinorUnits = (totalMinor, entries) => {
    assertSafeNonNegativeInteger(totalMinor, 'Allocation total');
    if (entries.length === 0) {
        if (totalMinor === 0)
            return {};
        throw new Error('A positive amount requires at least one allocation recipient.');
    }
    const identifiers = new Set();
    for (const entry of entries) {
        if (!entry.id.trim())
            throw new Error('Allocation recipient identifiers are required.');
        if (identifiers.has(entry.id)) {
            throw new Error('Allocation recipient identifiers must be unique.');
        }
        identifiers.add(entry.id);
        assertSafeNonNegativeInteger(entry.weight, 'Allocation weight');
    }
    const configuredWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    const effectiveEntries = entries.map((entry) => ({
        ...entry,
        weight: configuredWeight === 0 ? 1 : entry.weight,
    }));
    const totalWeight = effectiveEntries.reduce((sum, entry) => sum + entry.weight, 0);
    const total = BigInt(totalMinor);
    const divisor = BigInt(totalWeight);
    const calculations = effectiveEntries.map((entry) => {
        const numerator = total * BigInt(entry.weight);
        return {
            id: entry.id,
            allocated: numerator / divisor,
            remainder: numerator % divisor,
        };
    });
    const allocatedFloor = calculations.reduce((sum, entry) => sum + entry.allocated, 0n);
    let residual = total - allocatedFloor;
    const ranked = [...calculations].toSorted((left, right) => {
        if (left.remainder === right.remainder)
            return left.id.localeCompare(right.id);
        return left.remainder > right.remainder ? -1 : 1;
    });
    for (const entry of ranked) {
        if (residual === 0n)
            break;
        entry.allocated += 1n;
        residual -= 1n;
    }
    return Object.fromEntries(calculations.map((entry) => [entry.id, toSafeNumber(entry.allocated, 'Allocated share')]));
};
const calculateLineTotal = (item) => {
    if (!item.itemId.trim() || !item.itemName.trim()) {
        throw new Error('Receipt items require an identity and name.');
    }
    if (!item.createdByUserId.trim() || !item.createdByName.trim()) {
        throw new Error('Receipt items require creator attribution.');
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error('Receipt item quantities must be positive whole numbers.');
    }
    assertSafeNonNegativeInteger(item.unitPriceMinor, 'Item unit price');
    return toSafeNumber(BigInt(item.quantity) * BigInt(item.unitPriceMinor), 'Receipt line total');
};
const allocationEntries = (receipts, strategy) => receipts.map((receipt) => ({
    id: receipt.userId,
    weight: strategy === 'equal' ? 1 : receipt.itemSubtotalMinor,
}));
const buildItemAttribution = (receipts) => {
    const items = new Map();
    for (const receipt of receipts) {
        for (const line of receipt.lines) {
            const existing = items.get(line.itemId);
            if (existing) {
                if (existing.itemName !== line.itemName ||
                    existing.createdByUserId !== line.createdByUserId ||
                    existing.createdByName !== line.createdByName) {
                    throw new Error('An item identity cannot reference conflicting snapshots.');
                }
                existing.totalQuantity += line.quantity;
                existing.orderedBy.push({
                    userId: receipt.userId,
                    displayName: receipt.displayName,
                    quantity: line.quantity,
                });
                continue;
            }
            items.set(line.itemId, {
                itemId: line.itemId,
                itemName: line.itemName,
                createdByUserId: line.createdByUserId,
                createdByName: line.createdByName,
                totalQuantity: line.quantity,
                orderedBy: [
                    {
                        userId: receipt.userId,
                        displayName: receipt.displayName,
                        quantity: line.quantity,
                    },
                ],
            });
        }
    }
    return [...items.values()]
        .map((item) => ({
        ...item,
        orderedBy: item.orderedBy.toSorted((left, right) => left.userId.localeCompare(right.userId)),
    }))
        .toSorted((left, right) => left.itemId.localeCompare(right.itemId));
};
export const calculateGroupOrderReceipt = (input) => {
    if (input.participants.length === 0) {
        throw new Error('A group order requires at least one participant.');
    }
    const participantIds = new Set();
    const baseReceipts = input.participants.map((participant) => {
        if (!participant.userId.trim() || !participant.displayName.trim()) {
            throw new Error('Group-order participants require an identity and display name.');
        }
        if (participantIds.has(participant.userId)) {
            throw new Error('Group-order participant identifiers must be unique.');
        }
        participantIds.add(participant.userId);
        const lines = participant.items.map((item) => ({
            ...item,
            lineTotalMinor: calculateLineTotal(item),
        }));
        const itemSubtotalMinor = lines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
        assertSafeNonNegativeInteger(itemSubtotalMinor, 'Participant item subtotal');
        return {
            userId: participant.userId,
            displayName: participant.displayName,
            lines,
            itemSubtotalMinor,
            vatShareMinor: 0,
            serviceShareMinor: 0,
            deliveryShareMinor: 0,
            totalMinor: itemSubtotalMinor,
        };
    });
    assertSafeNonNegativeInteger(input.policy.deliveryMinor, 'Delivery charge');
    const itemSubtotalMinor = baseReceipts.reduce((sum, receipt) => sum + receipt.itemSubtotalMinor, 0);
    assertSafeNonNegativeInteger(itemSubtotalMinor, 'Order item subtotal');
    const vatMinor = calculateBasisPointCharge(itemSubtotalMinor, input.policy.vatBasisPoints);
    const serviceMinor = calculateBasisPointCharge(itemSubtotalMinor, input.policy.serviceBasisPoints);
    const vatShares = allocateMinorUnits(vatMinor, allocationEntries(baseReceipts, input.policy.vatAllocation));
    const serviceShares = allocateMinorUnits(serviceMinor, allocationEntries(baseReceipts, input.policy.serviceAllocation));
    const deliveryShares = allocateMinorUnits(input.policy.deliveryMinor, allocationEntries(baseReceipts, input.policy.deliveryAllocation));
    const participantReceipts = baseReceipts.map((receipt) => {
        const vatShareMinor = vatShares[receipt.userId] ?? 0;
        const serviceShareMinor = serviceShares[receipt.userId] ?? 0;
        const deliveryShareMinor = deliveryShares[receipt.userId] ?? 0;
        return {
            ...receipt,
            vatShareMinor,
            serviceShareMinor,
            deliveryShareMinor,
            totalMinor: receipt.itemSubtotalMinor +
                vatShareMinor +
                serviceShareMinor +
                deliveryShareMinor,
        };
    });
    const grandTotalMinor = itemSubtotalMinor + vatMinor + serviceMinor + input.policy.deliveryMinor;
    const receiptTotal = participantReceipts.reduce((sum, receipt) => sum + receipt.totalMinor, 0);
    if (receiptTotal !== grandTotalMinor) {
        throw new Error('Participant receipts do not reconcile with the order total.');
    }
    return {
        currency: input.currency,
        itemSubtotalMinor,
        vatMinor,
        serviceMinor,
        deliveryMinor: input.policy.deliveryMinor,
        grandTotalMinor,
        participantReceipts,
        items: buildItemAttribution(participantReceipts),
    };
};
