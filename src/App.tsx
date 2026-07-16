import { AppLayout } from '@/components/AppLayout';
import { AuthLayout } from '@/components/AuthLayout';
import { AUTH_PATH, authRoutes, LOGIN_PATH } from '@/modules/auth';
import { bucketsRoutes } from '@/modules/buckets';
import { dashboardRoutes } from '@/modules/dashboard';
import { groupOrdersRoutes } from '@/modules/group-orders';
import { ordersRoutes } from '@/modules/orders';
import { useApp } from '@/modules/session';
import { settingsRoutes } from '@/modules/settings';
import { socialRoutes } from '@/modules/social';
import { Navigate, Outlet, Route, Routes } from '@/packages/router';
import { NotFoundPage } from '@/pages/NotFoundPage';
import type { AppRouteDescriptor } from '@/shared/types';
import { Loading } from '@/shared/ui';

function ProtectedRoute() { const { user, authLoading, t } = useApp(); if (authLoading) return <Loading label={t('loading')} />; return user ? <Outlet /> : <Navigate to={LOGIN_PATH} replace />; }
function GuestRoute() { const { user, authLoading, t } = useApp(); if (authLoading) return <Loading label={t('loading')} />; return user ? <Navigate to="/" replace /> : <Outlet />; }

const renderRoute = (route: AppRouteDescriptor) =>
  route.index ? (
    <Route key="index" index element={route.element} />
  ) : (
    <Route key={route.path ?? 'index'} path={route.path} element={route.element} />
  );

export default function App() {
  return <Routes>
    <Route element={<GuestRoute />}>
      <Route path={AUTH_PATH} element={<AuthLayout />}>
        {authRoutes.map((route) => renderRoute(route))}
      </Route>
    </Route>
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        {dashboardRoutes.map((route) => renderRoute(route))}
        {bucketsRoutes.map((route) => renderRoute(route))}
        {ordersRoutes.map((route) => renderRoute(route))}
        {groupOrdersRoutes.map((route) => renderRoute(route))}
        {socialRoutes.map((route) => renderRoute(route))}
        {settingsRoutes.map((route) => renderRoute(route))}
      </Route>
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes>;
}
