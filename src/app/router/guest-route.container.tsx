import { useApp } from '@/modules/session';
import { Navigate, Outlet } from '@/packages/router';
import { Loading } from '@/shared/ui';

import { HOME_PATH } from './app-route-paths.constants';

/** Gate that only renders child routes for a signed-out visitor. */
export function GuestRouteContainer() {
  const { user, authLoading, t } = useApp();
  if (authLoading) return <Loading label={t('loading')} />;
  return user ? <Navigate to={HOME_PATH} replace /> : <Outlet />;
}
