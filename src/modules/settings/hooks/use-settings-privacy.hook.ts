import { type SyntheticEvent, useEffect, useState } from 'react';

import { useApp } from '@/modules/session';
import {
  type AnalyticsConsent,
  DEFAULT_ANALYTICS_CONSENT,
  loadAnalyticsConsent,
  saveAnalyticsConsent,
} from '@/modules/telemetry';
import type { MessageKey } from '@/shared/i18n';

import type { SettingsMessageKey } from '../i18n/settings-messages.constants';
import { translateSettings } from '../i18n/translate-settings.helper';

export interface SettingsPrivacyViewModel {
  t: (key: MessageKey) => string;
  settingsT: (key: SettingsMessageKey) => string;
  analyticsConsent: AnalyticsConsent;
  setAnalyticsConsent: (value: AnalyticsConsent) => void;
  loading: boolean;
  busy: boolean;
  submit: (event: SyntheticEvent) => Promise<void>;
}

/** Analytics consent state for the privacy subpage. */
export function useSettingsPrivacy(): SettingsPrivacyViewModel {
  const { locale, t, showToast } = useApp();
  const [analyticsConsent, setAnalyticsConsent] = useState<AnalyticsConsent>(
    DEFAULT_ANALYTICS_CONSENT,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const settingsT = (key: SettingsMessageKey): string =>
    translateSettings(locale, key);

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault();
    try {
      setBusy(true);
      await saveAnalyticsConsent(analyticsConsent);
      showToast(settingsT('analyticsConsentSaved'), 'success');
    } catch {
      showToast(t('tryAgain'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return {
    t,
    settingsT,
    analyticsConsent,
    setAnalyticsConsent,
    loading,
    busy,
    submit,
  };
}
