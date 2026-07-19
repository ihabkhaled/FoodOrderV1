import type { AppRouteDescriptor } from '@/shared/types';

import { CreateOrderSessionContainer } from '../containers/create-order-session.container';
import { OrderSessionDetailsContainer } from '../containers/order-session-details.container';
import { OrderSessionsContainer } from '../containers/order-sessions.container';
import {
  ORDER_SESSION_DETAILS_PATH,
  ORDER_SESSION_NEW_PATH,
  ORDER_SESSIONS_PATH,
} from './order-sessions-route-paths.constants';

export const orderSessionsRoutes = [
  {
    path: ORDER_SESSIONS_PATH,
    element: <OrderSessionsContainer />,
  },
  {
    path: ORDER_SESSION_NEW_PATH,
    element: <CreateOrderSessionContainer />,
  },
  {
    path: ORDER_SESSION_DETAILS_PATH,
    element: <OrderSessionDetailsContainer />,
  },
] satisfies AppRouteDescriptor[];
