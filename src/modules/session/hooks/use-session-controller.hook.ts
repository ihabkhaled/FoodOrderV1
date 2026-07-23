import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ProfileDefaults, SessionUser, UserProfile } from '@/modules/data-access';
import { authService, dataService, storageMode } from '@/modules/data-access';
import {
  setFirebaseErrorLocale,
  userFacingErrorMessage,
} from '@/packages/firebase';
import { applyDocumentLocale, applyDocumentTheme } from '@/platform/browser';
import {
  DEFAULT_DEVICE_CONFIG,
  type DeviceConfig,
  impact,
  loadDeviceConfig,
  saveDeviceConfig,
} from '@/platform/device';
import {
  getNetworkStatus,
  isNavigatorOnline,
  subscribeToOnlineChange,
} from '@/platform/network';
import { localeDirection, translate } from '@/shared/i18n';

import type { AppContextValue, ToastState } from '../types/session.types';

/**
 * The full session state machine behind {@link AppProvider}: device config,
 * auth subscription, profile loading, document locale/theme application,
 * online tracking, and the toast timer.
 */
export const useSessionController = (): AppContextValue => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [device, setDevice] = useState<DeviceConfig>(DEFAULT_DEVICE_CONFIG);
  const locale = profile?.locale ?? device.locale;
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

  useEffect(
    () =>
      authService.subscribe((nextUser) => {
        setUser(nextUser);
        setAuthLoading(false);
        if (!nextUser) setProfile(null);
      }),
    [],
  );

  const [profileLoadedFor, setProfileLoadedFor] = useState<string | null>(null);
  useEffect(() => {
    if (!user || profileLoadedFor === user.id) return;
    setProfileLoadedFor(user.id);
    void dataService
      .getProfile(user, defaults)
      .then(setProfile)
      .catch((error: unknown) => {
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
      locale,
      theme,
      currency,
      toast,
      t: (key) => translate(locale, key),
      errorMessage: (error, fallbackKey = 'tryAgain') =>
        userFacingErrorMessage(error, locale, translate(locale, fallbackKey)),
      login: async (email, password) => {
        await authService.login(email, password);
        await impact();
        showToast(translate(locale, 'signedIn'), 'success');
      },
      register: async (fullName, email, password) => {
        await authService.register(fullName, email, password, defaults);
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
      locale,
      theme,
      currency,
      toast,
      defaults,
      showToast,
    ],
  );
};
