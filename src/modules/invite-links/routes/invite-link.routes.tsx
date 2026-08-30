import type { AppRouteDescriptor } from '@/shared/types';

import { InviteLinkContainer } from '../containers/invite-link.container';
import { INVITE_LINK_ROUTE_PATH } from './invite-link-route-paths.constants';

export const inviteLinkRoutes: AppRouteDescriptor[] = [
  {
    path: INVITE_LINK_ROUTE_PATH,
    element: <InviteLinkContainer />,
  },
];
