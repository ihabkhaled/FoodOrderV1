import type { Locale } from '@/modules/data-access';

import {
  SETTINGS_MESSAGES,
  type SettingsMessageKey,
} from './settings-messages.constants';

export const translateSettings = (
  locale: Locale,
  key: SettingsMessageKey,
): string => SETTINGS_MESSAGES[locale][key];
