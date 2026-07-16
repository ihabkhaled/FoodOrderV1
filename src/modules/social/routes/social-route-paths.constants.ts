/** Absolute navigation targets owned by the social module. */
export const SOCIAL_PATH = '/social';

export const buildBucketSocialShareRoute = (bucketId: string): string =>
  `/buckets/${bucketId}/social-share`;
