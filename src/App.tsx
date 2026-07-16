import { AppLayout } from '@/components/AppLayout';
import { AuthLayout } from '@/components/AuthLayout';
import { AUTH_PATH, authRoutes, LOGIN_PATH } from '@/modules/auth';
import { useApp } from '@/modules/session';
import { settingsRoutes } from '@/modules/settings';
import { socialRoutes } from '@/modules/social';
import { Navigate, Outlet, Route, Routes } from '@/packages/router';
import { BucketCollaboratePage } from '@/pages/BucketCollaboratePage';
import { BucketEditorPage } from '@/pages/BucketEditorPage';
import { BucketSharePage } from '@/pages/BucketSharePage';
import { BucketsPage } from '@/pages/BucketsPage';
import { CreateOrderPage } from '@/pages/CreateOrderPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { JoinBucketPage } from '@/pages/JoinBucketPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OrderDetailsPage } from '@/pages/OrderDetailsPage';
import { OrdersPage } from '@/pages/OrdersPage';
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
        <Route index element={<DashboardPage />} />
        <Route path="buckets" element={<BucketsPage />} />
        <Route path="buckets/new" element={<BucketEditorPage />} />
        <Route path="buckets/:bucketId/edit" element={<BucketEditorPage />} />
        <Route path="buckets/:bucketId/order" element={<CreateOrderPage />} />
        <Route path="buckets/:bucketId/collaborate" element={<BucketCollaboratePage />} />
        <Route path="buckets/:bucketId/share" element={<BucketSharePage />} />
        {socialRoutes.map((route) => renderRoute(route))}
        <Route path="join" element={<JoinBucketPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:orderId" element={<OrderDetailsPage />} />
        {settingsRoutes.map((route) => renderRoute(route))}
      </Route>
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes>;
}
