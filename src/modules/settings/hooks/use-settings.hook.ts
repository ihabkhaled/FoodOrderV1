import { type SyntheticEvent, useEffect, useState } from 'react';

import type {
  CurrencyCode,
  Locale,
  ProfileDefaults,
  Theme,
} from '@/modules/data-access';
import { authService, dataService } from '@/modules/data-access';
import { useApp } from '@/modules/session';
import {
  type AnalyticsConsent,
  DEFAULT_ANALYTICS_CONSENT,
  loadAnalyticsConsent,
  saveAnalyticsConsent,
} from '@/modules/telemetry';
import { downloadTextFile } from '@/platform/browser';
import { env } from '@/platform/environment';
import type { MessageKey } from '@/shared/i18n';

import type { SettingsMessageKey } from '../i18n/settings-messages.constants';
import { translateSettings } from '../i18n/translate-settings.helper';

export interface SettingsViewModel {
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
  analyticsConsent: AnalyticsConsent;
  setAnalyticsConsent: (value: AnalyticsConsent) => void;
  analyticsConsentLoading: boolean;
  busy: boolean;
  error: string;
  submit: (event: SyntheticEvent) => Promise<void>;
  storageModeValue: string;
  connectionValue: string;
  appVersionValue: string;
  exporting: boolean;
  exportData: () => Promise<void>;
  confirmingDelete: boolean;
  requestDelete: () => void;
  cancelDelete: () => void;
  deleting: boolean;
  deleteAccount: () => Promise<void>;
}

export function useSettings(): SettingsViewModel {
  const { user, profile, storageMode, online, t, saveProfile, showToast } =
    useApp();
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [locale, setLocale] = useState<Locale>(profile?.locale ?? 'en');
  const [theme, setTheme] = useState<Theme>(profile?.theme ?? 'system');
  const [currency, setCurrency] = useState<CurrencyCode>(
    profile?.defaultCurrency ?? 'EGP',
  );
  const [analyticsConsent, setAnalyticsConsent] = useState<AnalyticsConsent>(
    DEFAULT_ANALYTICS_CONSENT,
  );
  const [analyticsConsentLoading, setAnalyticsConsentLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setLocale(profile.locale);
      setTheme(profile.theme);
      setCurrency(profile.defaultCurrency);
    }
  }, [profile]);

  useEffect(() => {
    let active = true;

    void loadAnalyticsConsent()
      .then((storedConsent) => {
        if (active) setAnalyticsConsent(storedConsent);
      })
      .catch(() => {
        if (active) setAnalyticsConsent(DEFAULT_ANALYTICS_CONSENT);
      })
      .finally(() => {
        if (active) setAnalyticsConsentLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const settingsT = (key: SettingsMessageKey): string =>
    translateSettings(locale, key);

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (!fullName.trim()) {
      setError(t('fullNameRequired'));
      return;
    }
    try {
      setBusy(true);
      setError('');
      await Promise.all([
        saveProfile({
          fullName: fullName.trim(),
          locale,
          theme,
          defaultCurrency: currency,
        }),
        saveAnalyticsConsent(analyticsConsent),
      ]);
      showToast(settingsT('analyticsConsentSaved'), 'success');
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('tryAgain'));
    } finally {
      setBusy(false);
    }
  };

  const exportData = async () => {
    if (!user) return;
    try {
      setExporting(true);
      const defaults: ProfileDefaults = {
        locale,
        theme,
        defaultCurrency: currency,
      };
      const data = await dataService.exportUserData(user, defaults);
      downloadTextFile(
        `foodorder-export-${data.exportedAt.slice(0, 10)}.json`,
        JSON.stringify(data, null, 2),
      );
      showToast(t('exportReady'), 'success');
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      setDeleting(true);
      await dataService.deleteAllUserData(user);
      await authService.deleteAccount(user);
      showToast(t('accountDeleted'), 'success');
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : '';
      showToast(
        message.includes('requires-recent-login')
          ? t('requiresRecentLogin')
          : message || t('tryAgain'),
        'error',
      );
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
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
    analyticsConsent,
    setAnalyticsConsent,
    analyticsConsentLoading,
    busy,
    error,
    submit,
    storageModeValue:
      storageMode === 'firebase' ? t('firebaseMode') : t('localMode'),
    connectionValue: online ? t('online') : t('offline'),
    appVersionValue: `v${env.appVersion}`,
    exporting,
    exportData,
    confirmingDelete,
    requestDelete: () => {
      setConfirmingDelete(true);
    },
    cancelDelete: () => {
      setConfirmingDelete(false);
    },
    deleting,
    deleteAccount,
  };
}
