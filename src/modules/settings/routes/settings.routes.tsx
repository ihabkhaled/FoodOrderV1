import type { AppRouteDescriptor } from '@/shared/types';

import { SettingsContainer } from '../containers/settings.container';

/**
 * Route descriptors the app shell mounts under the protected app layout.
 * The absolute target lives in `settings-route-paths.constants.ts`.
 */
export const settingsRoutes: AppRouteDescriptor[] = [
  { path: 'settings', element: <SettingsContainer /> },
];
