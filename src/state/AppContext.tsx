import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translate, type MessageKey } from '@/i18n/messages';
import { getNetworkStatus, impact } from '@/services/platform';
import { authService, dataService, storageMode } from '@/services';
import {
  DEFAULT_DEVICE_CONFIG,
  loadDeviceConfig,
  saveDeviceConfig,
  type DeviceConfig,
} from '@/state/deviceConfig';
import type { CurrencyCode, Locale, ProfileDefaults, SessionUser, Theme, UserProfile } from '@/types/domain';

interface ToastState { message: string; kind: 'success' | 'error' | 'info' }
interface AppContextValue {
  user: SessionUser | null;
  profile: UserProfile | null;
  authLoading: boolean;
  online: boolean;
  storageMode: string;
  locale: Locale;
  theme: Theme;
  currency: CurrencyCode;
  toast: ToastState | null;
  t: (key: MessageKey) => string;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  saveProfile: (changes: Partial<Pick<UserProfile, 'fullName' | 'locale' | 'theme' | 'defaultCurrency'>>) => Promise<void>;
  /** Runtime language switch that also works before signing in. */
  setDeviceLocale: (locale: Locale) => Promise<void>;
  showToast: (message: string, kind?: ToastState['kind']) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const applyTheme = (theme: Theme): void => {
  const isDark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
};

export function AppProvider({ children }: { children: ReactNode }) {
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
    () => ({ locale: device.locale, theme: device.theme, defaultCurrency: device.currency }),
    [device],
  );

  useEffect(() => {
    void loadDeviceConfig().then(setDevice).catch(() => { setDevice(DEFAULT_DEVICE_CONFIG); });
  }, []);

  useEffect(() => authService.subscribe((nextUser) => {
    setUser(nextUser);
    setAuthLoading(false);
    if (!nextUser) setProfile(null);
  }), []);

  const [profileLoadedFor, setProfileLoadedFor] = useState<string | null>(null);
  useEffect(() => {
    if (!user || profileLoadedFor === user.id) return;
    setProfileLoadedFor(user.id);
    void dataService.getProfile(user, defaults).then(setProfile).catch((error: unknown) => {
      setToast({ message: error instanceof Error ? error.message : 'Unable to load profile.', kind: 'error' });
    });
  }, [user, defaults, profileLoadedFor]);

  useEffect(() => {
    applyTheme(theme);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale, theme]);

  useEffect(() => {
    const refresh = (): void => { void getNetworkStatus().then(setOnline).catch(() => { setOnline(navigator.onLine); }); };
    refresh();
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    return () => { window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh); };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => { setToast(null); }, 3600);
    return () => { window.clearTimeout(timer); };
  }, [toast]);

  const showToast = useCallback((message: string, kind: ToastState['kind'] = 'info') => {
    setToast({ message, kind });
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    user, profile, authLoading, online, storageMode, locale, theme, currency, toast,
    t: (key) => translate(locale, key),
    login: async (email, password) => { await authService.login(email, password); await impact(); showToast(translate(locale, 'signedIn'), 'success'); },
    register: async (fullName, email, password) => { await authService.register(fullName, email, password, defaults); await impact(); showToast(translate(locale, 'accountCreated'), 'success'); },
    resetPassword: async (email) => { await authService.resetPassword(email); showToast(translate(locale, 'resetSent'), 'success'); },
    logout: async () => { await authService.logout(); },
    saveProfile: async (changes) => {
      if (!profile) throw new Error('Profile is not loaded.');
      const saved = await dataService.saveProfile({ ...profile, ...changes });
      setProfile(saved);
      const deviceChanges: Partial<DeviceConfig> = {};
      if (changes.locale) deviceChanges.locale = changes.locale;
      if (changes.theme) deviceChanges.theme = changes.theme;
      if (changes.defaultCurrency) deviceChanges.currency = changes.defaultCurrency;
      if (Object.keys(deviceChanges).length) {
        await saveDeviceConfig(deviceChanges);
        setDevice((current) => ({ ...current, ...deviceChanges }));
      }
      showToast(translate(saved.locale, 'settingsSaved'), 'success');
    },
    setDeviceLocale: async (nextLocale) => {
      await saveDeviceConfig({ locale: nextLocale });
      setDevice((current) => ({ ...current, locale: nextLocale }));
      if (profile) {
        const saved = await dataService.saveProfile({ ...profile, locale: nextLocale });
        setProfile(saved);
      }
    },
    showToast,
  }), [user, profile, authLoading, online, locale, theme, currency, toast, defaults, showToast]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider.');
  return context;
};
