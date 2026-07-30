import { type SyntheticEvent, useEffect, useState } from 'react';

import type { CurrencyCode, Locale, Theme } from '@/modules/data-access';
import { useApp } from '@/modules/session';
import type { NotificationPermissionState } from '@/platform/device';
import {
  queryNotificationPermission,
  requestNotificationPermission,
} from '@/platform/device';
import type { MessageKey } from '@/shared/i18n';

import type { SettingsMessageKey } from '../i18n/settings-messages.constants';
import { translateSettings } from '../i18n/translate-settings.helper';

export interface SettingsPreferencesViewModel {
  t: (key: MessageKey) => string;
  settingsT: (key: SettingsMessageKey) => string;
  profileEmail: string;
  fullName: string;
  setFullName: (value: string) => void;
  locale: Locale;
  setLocale: (value: Locale) => void;
  theme: Theme;
  setTheme: (value: Theme) => void;
  currency: CurrencyCode;
  setCurrency: (value: CurrencyCode) => void;
  busy: boolean;
  error: string;
  submit: (event: SyntheticEvent) => Promise<void>;
  notificationPermission: NotificationPermissionState;
  enableNotifications: () => Promise<void>;
}

/** Profile identity and runtime preferences, saved together on submit. */
export function useSettingsPreferences(): SettingsPreferencesViewModel {
  const { profile, t, saveProfile, showToast } = useApp();
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [locale, setLocale] = useState<Locale>(profile?.locale ?? 'en');
  const [theme, setTheme] = useState<Theme>(profile?.theme ?? 'system');
  const [currency, setCurrency] = useState<CurrencyCode>(
    profile?.defaultCurrency ?? 'EGP',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>('unsupported');

  useEffect(() => {
    let active = true;
    void queryNotificationPermission()
      .then((state) => {
        if (active) setNotificationPermission(state);
      })
      .catch(() => {
        if (active) setNotificationPermission('unsupported');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setLocale(profile.locale);
      setTheme(profile.theme);
      setCurrency(profile.defaultCurrency);
    }
  }, [profile]);

  const settingsT = (key: SettingsMessageKey): string =>
    translateSettings(locale, key);

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault();
    if (!fullName.trim()) {
      setError(t('fullNameRequired'));
      return;
    }
    try {
      setBusy(true);
      setError('');
      await saveProfile({
        fullName: fullName.trim(),
        locale,
        theme,
        defaultCurrency: currency,
      });
      showToast(settingsT('preferencesSaved'), 'success');
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('tryAgain'));
    } finally {
      setBusy(false);
    }
  };

  return {
    t,
    settingsT,
    profileEmail: profile?.email ?? '',
    fullName,
    setFullName,
    locale,
    setLocale,
    theme,
    setTheme,
    currency,
    setCurrency,
    busy,
    error,
    submit,
    notificationPermission,
    enableNotifications: async () => {
      await requestNotificationPermission();
      setNotificationPermission(await queryNotificationPermission());
    },
  };
}
