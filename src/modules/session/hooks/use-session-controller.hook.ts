import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ProfileDefaults, SessionUser, UserProfile } from '@/modules/data-access';
import { authService, dataService, storageMode } from '@/modules/data-access';
import type { AnalyticsConsent } from '@/modules/telemetry';
import {
  ANALYTICS_EVENT,
  DEFAULT_ANALYTICS_CONSENT,
  loadAnalyticsConsent,
  RELIABILITY_ERROR_CATEGORY,
  telemetryRecorder,
} from '@/modules/telemetry';
import {
  setFirebaseErrorLocale,
  userFacingErrorMessage,
} from '@/packages/firebase';
import {
  applyDocumentLocale,
  applyDocumentTheme,
  navigateToBrowserLocale,
  subscribeToColorSchemeChange,
} from '@/platform/browser';
import {
  DEFAULT_DEVICE_CONFIG,
  type DeviceConfig,
  impact,
  isNativeApplication,
  loadDeviceConfig,
  runtimePlatformName,
  saveDeviceConfig,
} from '@/platform/device';
import { env } from '@/platform/environment';
import {
  getNetworkStatus,
  isNavigatorOnline,
  subscribeToOnlineChange,
} from '@/platform/network';
import { localeDirection, translate } from '@/shared/i18n';
import type { Locale } from '@/shared/types';

import type { AppContextValue, ToastState } from '../types/session.types';

/**
 * The full session state machine behind {@link AppProvider}: device config,
 * auth subscription, profile loading, document locale/theme application,
 * online tracking, and the toast timer.
 */
export const useSessionController = (initialLocale?: Locale): AppContextValue => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [localeNavigationPending, setLocaleNavigationPending] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [device, setDevice] = useState<DeviceConfig>(DEFAULT_DEVICE_CONFIG);
  const [analyticsConsent, setAnalyticsConsent] = useState<AnalyticsConsent>(
    DEFAULT_ANALYTICS_CONSENT,
  );
  const locale = initialLocale ?? profile?.locale ?? device.locale;
  const theme = profile?.theme ?? device.theme;
  const currency = profile?.defaultCurrency ?? device.currency;
  const defaults: ProfileDefaults = useMemo(
    () => ({
      locale: device.locale,
      theme: device.theme,
      defaultCurrency: device.currency,
    }),
    [device],
  );

  useEffect(() => {
    void loadDeviceConfig()
      .then(setDevice)
      .catch(() => {
        setDevice(DEFAULT_DEVICE_CONFIG);
      });
  }, []);

  const [profileLoadedFor, setProfileLoadedFor] = useState<string | null>(null);
  useEffect(
    () =>
      authService.subscribe((nextUser) => {
        setUser(nextUser);
        setAuthLoading(false);
        if (!nextUser) {
          setProfile(null);
          setProfileLoadedFor(null);
        }
      }),
    [],
  );

  useEffect(() => {
    if (!user || profileLoadedFor === user.id) return;
    setProfileLoadedFor(user.id);
    void dataService
      .getProfile(user, defaults)
      .then((nextProfile) => {
        setProfile(nextProfile);
        // Roam the saved language on the web: a fresh device boots on the URL
        // locale, so a differing profile locale redirects once after login.
        if (!isNativeApplication() && nextProfile.locale !== locale) {
          navigateToBrowserLocale(nextProfile.locale);
        }
      })
      .catch((error: unknown) => {
        telemetryRecorder.record(ANALYTICS_EVENT.gatewayError, {
          category: RELIABILITY_ERROR_CATEGORY.internal,
          operation: 'profile_load',
          errorCode: error instanceof Error ? error.name : 'unknown',
          retryable: true,
        });
        setToast({
          message: userFacingErrorMessage(
            error,
            locale,
            translate(locale, 'tryAgain'),
          ),
          kind: 'error',
        });
      });
  }, [user, defaults, profileLoadedFor, locale]);

  useEffect(() => {
    setFirebaseErrorLocale(locale);
    applyDocumentTheme(theme);
    applyDocumentLocale(locale, localeDirection(locale));
  }, [locale, theme]);

  // Diagnostics stay denied until the stored consent resolves, and the profile
  // copy wins so the choice roams with the account.
  useEffect(() => {
    void loadAnalyticsConsent()
      .then((storedConsent) => {
        const resolved = profile?.analyticsConsent ?? storedConsent;
        setAnalyticsConsent(resolved);
        telemetryRecorder.setConsent(resolved);
      })
      .catch(() => {
        // Leaving consent denied is the safe failure mode.
      });
  }, [profile?.analyticsConsent]);

  useEffect(() => {
    telemetryRecorder.setContext({
      appVersion: env.appVersion,
      locale,
      platform: runtimePlatformName(),
      storageMode,
      plan: 'free',
      correlationId: user?.id ? `u:${user.id.slice(0, 12)}` : 'anonymous',
      sessionId: null,
      workspaceId: null,
      experimentAssignments: null,
    });
  }, [locale, user?.id]);

  useEffect(() => {
    if (theme !== 'system') return;
    return subscribeToColorSchemeChange(() => {
      applyDocumentTheme('system');
    });
  }, [theme]);

  useEffect(() => {
    const refresh = (): void => {
      void getNetworkStatus()
        .then(setOnline)
        .catch(() => {
          setOnline(isNavigatorOnline());
        });
    };
    refresh();
    return subscribeToOnlineChange(refresh);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3600);
    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  const showToast = useCallback(
    (message: string, kind: ToastState['kind'] = 'info') => {
      setToast({ message, kind });
    },
    [],
  );

  return useMemo<AppContextValue>(
    () => ({
      user,
      profile,
      authLoading,
      online,
      storageMode,
      analyticsConsent,
      locale,
      localeNavigationPending,
      theme,
      currency,
      toast,
      t: (key) => translate(locale, key),
      errorMessage: (error, fallbackKey = 'tryAgain') =>
        userFacingErrorMessage(error, locale, translate(locale, fallbackKey)),
      login: async (email, password) => {
        await authService.login(email, password);
        telemetryRecorder.record(ANALYTICS_EVENT.authFlowStarted, {
          method: 'email_password',
          returnToInvite: false,
        });
        await impact();
        showToast(translate(locale, 'signedIn'), 'success');
      },
      register: async (fullName, email, password) => {
        await authService.register(fullName, email, password, defaults);
        telemetryRecorder.record(ANALYTICS_EVENT.registrationCompleted, {
          method: 'email_password',
          returnToInvite: false,
        });
        await impact();
        showToast(translate(locale, 'accountCreated'), 'success');
      },
      resetPassword: async (email) => {
        await authService.resetPassword(email);
        showToast(translate(locale, 'resetSent'), 'success');
      },
      logout: async () => {
        await authService.logout();
      },
      saveProfile: async (changes) => {
        if (!profile) throw new Error('Profile is not loaded.');
        const saved = await dataService.saveProfile({ ...profile, ...changes });
        setProfile(saved);
        const deviceChanges: Partial<DeviceConfig> = {};
        if (changes.locale) deviceChanges.locale = changes.locale;
        if (changes.theme) deviceChanges.theme = changes.theme;
        if (changes.defaultCurrency) {
          deviceChanges.currency = changes.defaultCurrency;
        }
        if (Object.keys(deviceChanges).length > 0) {
          await saveDeviceConfig(deviceChanges);
          setDevice((current) => ({ ...current, ...deviceChanges }));
        }
        showToast(translate(saved.locale, 'settingsSaved'), 'success');
      },
      setDeviceLocale: async (nextLocale) => {
        setLocaleNavigationPending(true);
        // Switch the visible locale immediately; persistence follows and its
        // failure is surfaced without reverting or blocking the switch.
        setDevice((current) => ({ ...current, locale: nextLocale }));
        if (profile) setProfile({ ...profile, locale: nextLocale });
        try {
          await saveDeviceConfig({ locale: nextLocale });
          if (profile) {
            const saved = await dataService.saveProfile({
              ...profile,
              locale: nextLocale,
            });
            setProfile(saved);
          }
        } catch (error) {
          showToast(
            userFacingErrorMessage(
              error,
              nextLocale,
              translate(nextLocale, 'tryAgain'),
            ),
            'error',
          );
        } finally {
          if (isNativeApplication()) {
            setLocaleNavigationPending(false);
          } else {
            navigateToBrowserLocale(nextLocale);
          }
        }
      },
      setDeviceTheme: async (nextTheme) => {
        setDevice((current) => ({ ...current, theme: nextTheme }));
        if (profile) setProfile({ ...profile, theme: nextTheme });
        try {
          await saveDeviceConfig({ theme: nextTheme });
          if (profile) {
            const saved = await dataService.saveProfile({
              ...profile,
              theme: nextTheme,
            });
            setProfile(saved);
          }
        } catch (error) {
          showToast(
            userFacingErrorMessage(error, locale, translate(locale, 'tryAgain')),
            'error',
          );
        }
      },
      showToast,
    }),
    [
      user,
      profile,
      authLoading,
      online,
      analyticsConsent,
      locale,
      localeNavigationPending,
      theme,
      currency,
      toast,
      defaults,
      showToast,
    ],
  );
};
