import { Navigate } from '@/packages/router';
import type { AppRouteDescriptor } from '@/shared/types';

import { ForgotPasswordContainer } from '../containers/forgot-password.container';
import { LoginContainer } from '../containers/login.container';
import { RegisterContainer } from '../containers/register.container';
import { ResetPasswordContainer } from '../containers/reset-password.container';

/**
 * Route descriptors the app shell mounts under the `/auth` guest layout.
 * Paths are relative segments; absolute targets live in
 * `auth-route-paths.constants.ts`.
 */
export const authRoutes: AppRouteDescriptor[] = [
  { index: true, element: <Navigate to="login" replace /> },
  { path: 'login', element: <LoginContainer /> },
  { path: 'register', element: <RegisterContainer /> },
  { path: 'forgot', element: <ForgotPasswordContainer /> },
  { path: 'action', element: <ResetPasswordContainer /> },
];
