import type { AppRouteDescriptor } from '@/shared/types';

import { SettingsAccountContainer } from '../containers/settings-account.container';
import { SettingsHubContainer } from '../containers/settings-hub.container';
import { SettingsPreferencesContainer } from '../containers/settings-preferences.container';
import { SettingsPrivacyContainer } from '../containers/settings-privacy.container';
import { SettingsSecurityContainer } from '../containers/settings-security.container';

/**
 * Route descriptors the app shell mounts under the protected app layout.
 * The absolute targets live in `settings-route-paths.constants.ts`.
 */
export const settingsRoutes: AppRouteDescriptor[] = [
  { path: 'settings', element: <SettingsHubContainer /> },
  { path: 'settings/preferences', element: <SettingsPreferencesContainer /> },
  { path: 'settings/privacy', element: <SettingsPrivacyContainer /> },
  { path: 'settings/security', element: <SettingsSecurityContainer /> },
  { path: 'settings/account', element: <SettingsAccountContainer /> },
];
