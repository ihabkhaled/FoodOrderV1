import { Navigate, useParams } from '@/packages/router';
import type { AppRouteDescriptor } from '@/shared/types';

import { BucketCollaborateContainer } from '../containers/bucket-collaborate.container';
import { BucketShareContainer } from '../containers/bucket-share.container';
import { JoinBucketContainer } from '../containers/join-bucket.container';
import { buildBucketShareRoute } from './group-orders-route-paths.constants';

/**
 * Members and activity used to be pages of their own. They are sections of the
 * share page now, because sharing a menu is one job and reading a person's
 * permissions should not require leaving the screen that grants them.
 *
 * The old addresses still resolve. People bookmark pages and paste them to each
 * other, and a link that dies teaches them not to trust the next one; the
 * fragment scrolls to the section that replaced the page.
 */
function ShareSectionRedirect({ section }: { section: 'members' | 'activity' }) {
  const { bucketId } = useParams();
  return <Navigate replace to={`${buildBucketShareRoute(bucketId ?? '')}#${section}`} />;
}

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
    element: <ShareSectionRedirect section="members" />,
  },
  {
    path: 'buckets/:bucketId/share/activity',
    element: <ShareSectionRedirect section="activity" />,
  },
  { path: 'join', element: <JoinBucketContainer /> },
];
