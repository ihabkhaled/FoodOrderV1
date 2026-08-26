import { buildAuthPathWithReturnTo, LOGIN_PATH } from '@/modules/auth';
import { useApp } from '@/modules/session';
import { Navigate, Outlet, useLocation } from '@/packages/router';
import { Loading } from '@/shared/ui';

/** Gate that only renders child routes for an authenticated user. */
export function ProtectedRouteContainer() {
  const { user, authLoading, t } = useApp();
  const location = useLocation();
  if (authLoading) return <Loading label={t('loading')} />;
  if (user) return <Outlet />;
  // Carry the destination through sign-in. Someone who opens a shared invite
  // link while signed out must land on that invite afterwards, not on a
  // dashboard with no idea what the link was for.
  const returnTo = `${location.pathname}${location.search}`;
  return <Navigate to={buildAuthPathWithReturnTo(LOGIN_PATH, returnTo)} replace />;
}
