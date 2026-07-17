import type { AppRouteDescriptor } from '@/shared/types';

import { DashboardContainer } from '../containers/dashboard.container';

/**
 * Route descriptors the app shell mounts under the protected app layout.
 * The dashboard owns the index route; other absolute targets it links to are
 * owned by the buckets and orders modules.
 */
export const dashboardRoutes: AppRouteDescriptor[] = [
  { index: true, element: <DashboardContainer /> },
];
