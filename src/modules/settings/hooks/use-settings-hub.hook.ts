import { useApp } from '@/modules/session';
import { env } from '@/platform/environment';
import type { MessageKey } from '@/shared/i18n';

import type { SettingsMessageKey } from '../i18n/settings-messages.constants';
import { translateSettings } from '../i18n/translate-settings.helper';

export interface SettingsHubViewModel {
  t: (key: MessageKey) => string;
  settingsT: (key: SettingsMessageKey) => string;
  fullName: string;
  email: string;
  connectionValue: string;
  appVersionValue: string;
}

export function useSettingsHub(): SettingsHubViewModel {
  const { profile, online, locale, t } = useApp();
  return {
    t,
    settingsT: (key) => translateSettings(locale, key),
    fullName: profile?.fullName ?? '',
    email: profile?.email ?? '',
    connectionValue: online ? t('online') : t('offline'),
    appVersionValue: `v${env.appVersion}`,
  };
}
