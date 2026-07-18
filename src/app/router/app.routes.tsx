import { AUTH_PATH, authRoutes } from '@/modules/auth';
import { bucketsRoutes } from '@/modules/buckets';
import { dashboardRoutes } from '@/modules/dashboard';
import { groupOrdersRoutes } from '@/modules/group-orders';
import { orderSessionsRoutes } from '@/modules/order-sessions';
import { ordersRoutes } from '@/modules/orders';
import { sessionInviteRoutes } from '@/modules/session-invites';
import { settingsRoutes } from '@/modules/settings';
import { socialRoutes } from '@/modules/social';
import { Route, Routes } from '@/packages/router';
import type { AppRouteDescriptor } from '@/shared/types';

import { AppLayoutContainer } from '../shell/app-layout.container';
import { AuthLayoutContainer } from '../shell/auth-layout.container';
import { GuestRouteContainer } from './guest-route.container';
import { NotFoundContainer } from './not-found.container';
import { ProtectedRouteContainer } from './protected-route.container';

const renderRoute = (route: AppRouteDescriptor) =>
  route.index ? (
    <Route key="index" index element={route.element} />
  ) : (
    <Route key={route.path ?? 'index'} path={route.path} element={route.element} />
  );

/** The composed route table mounting every module's route descriptors. */
export function AppRoutes() {
  return (
    <Routes>
      {sessionInviteRoutes.map((route) => renderRoute(route))}
      <Route element={<GuestRouteContainer />}>
        <Route path={AUTH_PATH} element={<AuthLayoutContainer />}>
          {authRoutes.map((route) => renderRoute(route))}
        </Route>
      </Route>
      <Route element={<ProtectedRouteContainer />}>
        <Route element={<AppLayoutContainer />}>
          {dashboardRoutes.map((route) => renderRoute(route))}
          {bucketsRoutes.map((route) => renderRoute(route))}
          {orderSessionsRoutes.map((route) => renderRoute(route))}
          {ordersRoutes.map((route) => renderRoute(route))}
          {groupOrdersRoutes.map((route) => renderRoute(route))}
          {socialRoutes.map((route) => renderRoute(route))}
          {settingsRoutes.map((route) => renderRoute(route))}
        </Route>
      </Route>
      <Route path="*" element={<NotFoundContainer />} />
    </Routes>
  );
}
