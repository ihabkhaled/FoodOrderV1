/** Absolute navigation targets owned by the orders module. */
export const ORDERS_PATH = '/orders';

export const buildOrderDetailsRoute = (orderId: string): string =>
  `/orders/${orderId}`;

export const buildCreateOrderRoute = (bucketId: string): string =>
  `/buckets/${bucketId}/order`;

/**
 * Cross-module redirect target. The buckets module imports orders (for
 * `buildCreateOrderRoute`), so orders owns a local copy of the buckets list
 * destination instead of importing `@/modules/buckets` (which would create a
 * cycle).
 */
export const BUCKETS_REDIRECT_PATH = '/buckets';
