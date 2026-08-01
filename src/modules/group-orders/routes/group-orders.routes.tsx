import type { AppRouteDescriptor } from '@/shared/types';

import { BucketCollaborateContainer } from '../containers/bucket-collaborate.container';
import { BucketShareContainer } from '../containers/bucket-share.container';
import { BucketShareActivityContainer } from '../containers/bucket-share-activity.container';
import { BucketShareMembersContainer } from '../containers/bucket-share-members.container';
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
  {
    path: 'buckets/:bucketId/share/members',
    element: <BucketShareMembersContainer />,
  },
  {
    path: 'buckets/:bucketId/share/activity',
    element: <BucketShareActivityContainer />,
  },
  { path: 'join', element: <JoinBucketContainer /> },
];
