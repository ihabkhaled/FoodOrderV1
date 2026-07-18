import type { AppRouteDescriptor } from '@/shared/types';

import { SessionInviteContainer } from '../session-invite.container';
import { SESSION_INVITE_PATH } from './session-invite-route-paths.constants';

export const sessionInviteRoutes: AppRouteDescriptor[] = [
  {
    path: SESSION_INVITE_PATH,
    element: <SessionInviteContainer />,
  },
];
