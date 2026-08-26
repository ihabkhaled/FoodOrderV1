import {
  resolvePostAuthRedirect,
  RETURN_TO_QUERY_PARAMETER,
} from '@/modules/auth';
import { useApp } from '@/modules/session';
import { Navigate, Outlet, useSearchParams } from '@/packages/router';
import { Loading } from '@/shared/ui';

import { HOME_PATH } from './app-route-paths.constants';

/**
 * Gate that only renders child routes for a signed-out visitor.
 *
 * An already-authenticated visitor is sent on rather than shown a sign-in form
 * — and to their pending destination when there is one, so following an invite
 * link while signed in does not dump them on the dashboard with no idea what
 * the link was for. `resolvePostAuthRedirect` rejects anything that is not an
 * internal path, so the parameter cannot become an open redirect.
 */
export function GuestRouteContainer() {
  const { user, authLoading, t } = useApp();
  const [searchParams] = useSearchParams();
  if (authLoading) return <Loading label={t('loading')} />;
  if (!user) return <Outlet />;
  const destination = resolvePostAuthRedirect(
    searchParams.get(RETURN_TO_QUERY_PARAMETER),
  );
  return <Navigate to={destination || HOME_PATH} replace />;
}
