import { LOGIN_PATH } from '@/modules/auth';
import { useApp } from '@/modules/session';
import { Navigate, Outlet } from '@/packages/router';
import { Loading } from '@/shared/ui';

/** Gate that only renders child routes for an authenticated user. */
export function ProtectedRouteContainer() {
  const { user, authLoading, t } = useApp();
  if (authLoading) return <Loading label={t('loading')} />;
  return user ? <Outlet /> : <Navigate to={LOGIN_PATH} replace />;
}
