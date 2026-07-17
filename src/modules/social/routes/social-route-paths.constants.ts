/** Absolute navigation targets owned by the social module. */
export const SOCIAL_PATH = '/social';

export const buildBucketSocialShareRoute = (bucketId: string): string =>
  `/buckets/${bucketId}/social-share`;

/**
 * Cross-module redirect target. social sits below buckets in the dependency
 * graph (buckets imports `@/modules/social`), so it owns a local copy of the
 * buckets destination instead of importing `@/modules/buckets`.
 */
export const BUCKETS_REDIRECT_PATH = '/buckets';
