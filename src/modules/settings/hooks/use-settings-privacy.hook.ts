import { type SyntheticEvent, useEffect, useState } from 'react';

import { useApp } from '@/modules/session';
import {
  type AnalyticsConsent,
  clearTelemetryBuffer,
  countTelemetryEvents,
  DEFAULT_ANALYTICS_CONSENT,
  loadAnalyticsConsent,
  saveAnalyticsConsent,
  telemetryRecorder,
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
  recordedEventCount: number;
  clearDiagnostics: () => void;
  submit: (event: SyntheticEvent) => Promise<void>;
}

/**
 * Analytics consent for the privacy subpage. The signed-in profile owns the
 * choice so it roams; the device preference is the offline/pre-login fallback.
 */
export function useSettingsPrivacy(): SettingsPrivacyViewModel {
  const { locale, profile, t, showToast, saveProfile } = useApp();
  const [analyticsConsent, setAnalyticsConsent] = useState<AnalyticsConsent>(
    profile?.analyticsConsent ?? DEFAULT_ANALYTICS_CONSENT,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [recordedEventCount, setRecordedEventCount] = useState(0);

  useEffect(() => {
    let active = true;

    void loadAnalyticsConsent()
      .then((storedConsent) => {
        if (!active) return;
        setAnalyticsConsent(profile?.analyticsConsent ?? storedConsent);
      })
      .catch(() => {
        if (active) setAnalyticsConsent(DEFAULT_ANALYTICS_CONSENT);
      })
      .finally(() => {
        if (active) {
          setRecordedEventCount(countTelemetryEvents());
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [profile?.analyticsConsent]);

  const settingsT = (key: SettingsMessageKey): string =>
    translateSettings(locale, key);

  const clearDiagnostics = (): void => {
    clearTelemetryBuffer();
    setRecordedEventCount(0);
  };

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault();
    try {
      setBusy(true);
      await saveAnalyticsConsent(analyticsConsent);
      telemetryRecorder.setConsent(analyticsConsent);
      if (profile) await saveProfile({ analyticsConsent });
      setRecordedEventCount(countTelemetryEvents());
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
    recordedEventCount,
    clearDiagnostics,
    submit,
  };
}
