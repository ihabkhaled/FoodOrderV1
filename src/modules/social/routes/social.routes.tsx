import type { AppRouteDescriptor } from '@/shared/types';

import { BucketSocialShareContainer } from '../containers/bucket-social-share.container';
import { SocialContainer } from '../containers/social.container';

/**
 * Route descriptors the app shell mounts under the protected app layout.
 * Paths are relative segments; absolute targets live in
 * `social-route-paths.constants.ts`.
 */
export const socialRoutes: AppRouteDescriptor[] = [
  { path: 'social', element: <SocialContainer /> },
  {
    path: 'buckets/:bucketId/social-share',
    element: <BucketSocialShareContainer />,
  },
];
