import type { AppRouteDescriptor } from '@/shared/types';

import { SessionInviteContainer } from '../session-invite.container';

export const sessionInviteRoutes: AppRouteDescriptor[] = [
  {
    path: 'invite/:shareCode',
    element: <SessionInviteContainer />,
  },
];
