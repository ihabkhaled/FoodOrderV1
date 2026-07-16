/** Absolute navigation targets owned by the buckets module. */
export const BUCKETS_PATH = '/buckets';
export const BUCKET_NEW_PATH = '/buckets/new';

export const buildBucketEditRoute = (bucketId: string): string =>
  `/buckets/${bucketId}/edit`;
