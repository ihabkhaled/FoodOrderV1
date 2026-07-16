import type { AppRouteDescriptor } from '@/shared/types';

import { BucketCollaborateContainer } from '../containers/bucket-collaborate.container';
import { BucketShareContainer } from '../containers/bucket-share.container';
import { JoinBucketContainer } from '../containers/join-bucket.container';

/**
 * Route descriptors the app shell mounts under the protected app layout.
 * Paths are relative segments; absolute targets live in
 * `group-orders-route-paths.constants.ts`.
 */
export const groupOrdersRoutes: AppRouteDescriptor[] = [
  {
    path: 'buckets/:bucketId/collaborate',
    element: <BucketCollaborateContainer />,
  },
  { path: 'buckets/:bucketId/share', element: <BucketShareContainer /> },
  { path: 'join', element: <JoinBucketContainer /> },
];
