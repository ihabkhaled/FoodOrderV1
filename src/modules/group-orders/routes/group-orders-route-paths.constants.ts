/** Absolute navigation targets owned by the group-orders module. */
export const JOIN_PATH = '/join';

export const buildBucketCollaborateRoute = (bucketId: string): string =>
  `/buckets/${bucketId}/collaborate`;

export const buildBucketShareRoute = (bucketId: string): string =>
  `/buckets/${bucketId}/share`;

/**
 * Cross-module redirect targets. group-orders sits below every other feature
 * module in the dependency graph (buckets and orders both import it), so it
 * owns local copies of the destinations it navigates to instead of importing
 * `@/modules/buckets` or `@/modules/orders` (which would create a cycle).
 */
export const BUCKETS_REDIRECT_PATH = '/buckets';

export const buildPlacedOrderRedirect = (orderId: string): string =>
  `/orders/${orderId}`;
