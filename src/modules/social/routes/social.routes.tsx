import type { AppRouteDescriptor } from '@/shared/types';

import { BucketSocialShareContainer } from '../containers/bucket-social-share.container';
import { SocialContainer } from '../containers/social.container';
import { SocialFriendsContainer } from '../containers/social-friends.container';
import { SocialGroupsContainer } from '../containers/social-groups.container';
import { SocialRequestsContainer } from '../containers/social-requests.container';

/**
 * Route descriptors the app shell mounts under the protected app layout.
 * Paths are relative segments; absolute targets live in
 * `social-route-paths.constants.ts`.
 */
export const socialRoutes: AppRouteDescriptor[] = [
  { path: 'social', element: <SocialContainer /> },
  { path: 'social/friends', element: <SocialFriendsContainer /> },
  { path: 'social/requests', element: <SocialRequestsContainer /> },
  { path: 'social/groups', element: <SocialGroupsContainer /> },
  {
    path: 'buckets/:bucketId/social-share',
    element: <BucketSocialShareContainer />,
  },
];
