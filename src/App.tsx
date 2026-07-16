import { AppLayout } from '@/components/AppLayout';
import { AuthLayout } from '@/components/AuthLayout';
import { useApp } from '@/modules/session';
import { Navigate, Outlet, Route, Routes } from '@/packages/router';
import { BucketCollaboratePage } from '@/pages/BucketCollaboratePage';
import { BucketEditorPage } from '@/pages/BucketEditorPage';
import { BucketSharePage } from '@/pages/BucketSharePage';
import { BucketSocialSharePage } from '@/pages/BucketSocialSharePage';
import { BucketsPage } from '@/pages/BucketsPage';
import { CreateOrderPage } from '@/pages/CreateOrderPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { JoinBucketPage } from '@/pages/JoinBucketPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OrderDetailsPage } from '@/pages/OrderDetailsPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SocialPage } from '@/pages/SocialPage';
import { Loading } from '@/shared/ui';

function ProtectedRoute() { const { user, authLoading, t } = useApp(); if (authLoading) return <Loading label={t('loading')} />; return user ? <Outlet /> : <Navigate to="/auth/login" replace />; }
function GuestRoute() { const { user, authLoading, t } = useApp(); if (authLoading) return <Loading label={t('loading')} />; return user ? <Navigate to="/" replace /> : <Outlet />; }

export default function App() {
  return <Routes>
    <Route element={<GuestRoute />}>
      <Route path="/auth" element={<AuthLayout />}>
        <Route index element={<Navigate to="login" replace />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot" element={<ForgotPasswordPage />} />
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
        <Route path="buckets/:bucketId/social-share" element={<BucketSocialSharePage />} />
        <Route path="join" element={<JoinBucketPage />} />
        <Route path="social" element={<SocialPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:orderId" element={<OrderDetailsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes>;
}
