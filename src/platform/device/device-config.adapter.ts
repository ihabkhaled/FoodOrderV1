import { env } from '@/platform/environment';
import type { CurrencyCode, Locale, Theme } from '@/shared/types';

import { getPreference, setPreference } from '../storage/preferences.adapter';

/**
 * Device-level runtime configuration. Locale, currency, and theme are not
 * build-time environment values: they default here in code and every user
 * can change them at any time from Settings (or the auth screen language
 * toggle). Values persist per device through Capacitor Preferences and are
 * also copied into the signed-in profile so they roam with the account.
 */
export interface DeviceConfig {
  locale: Locale;
  currency: CurrencyCode;
  theme: Theme;
}

export const SUPPORTED_LOCALES: Locale[] = ['en', 'ar'];
export const SUPPORTED_CURRENCIES: CurrencyCode[] = ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'];
export const SUPPORTED_THEMES: Theme[] = ['system', 'light', 'dark'];

export const DEFAULT_DEVICE_CONFIG: DeviceConfig = {
  locale: env.initialLocale,
  currency: SUPPORTED_CURRENCIES.includes(env.initialCurrency as CurrencyCode)
    ? (env.initialCurrency as CurrencyCode)
    : 'EGP',
  theme: 'system',
};

const KEYS = { locale: 'locale', currency: 'currency', theme: 'theme' } as const;

const isLocale = (value: string | null): value is Locale =>
  SUPPORTED_LOCALES.includes(value as Locale);
const isCurrency = (value: string | null): value is CurrencyCode =>
  SUPPORTED_CURRENCIES.includes(value as CurrencyCode);
const isTheme = (value: string | null): value is Theme => SUPPORTED_THEMES.includes(value as Theme);

export const loadDeviceConfig = async (): Promise<DeviceConfig> => {
  const [locale, currency, theme] = await Promise.all([
    getPreference(KEYS.locale),
    getPreference(KEYS.currency),
    getPreference(KEYS.theme),
  ]);
  return {
    locale: isLocale(locale) ? locale : DEFAULT_DEVICE_CONFIG.locale,
    currency: isCurrency(currency) ? currency : DEFAULT_DEVICE_CONFIG.currency,
    theme: isTheme(theme) ? theme : DEFAULT_DEVICE_CONFIG.theme,
  };
};

export const saveDeviceConfig = async (changes: Partial<DeviceConfig>): Promise<void> => {
  const writes: Promise<void>[] = [];
  if (changes.locale) writes.push(setPreference(KEYS.locale, changes.locale));
  if (changes.currency) writes.push(setPreference(KEYS.currency, changes.currency));
  if (changes.theme) writes.push(setPreference(KEYS.theme, changes.theme));
  await Promise.all(writes);
};

/** Sidebar collapsed state is a device-only UI preference (never roams to the profile). */
const SIDEBAR_KEY = 'ui:sidebar-collapsed';
export const loadSidebarCollapsed = async (): Promise<boolean> =>
  (await getPreference(SIDEBAR_KEY)) === 'true';
export const saveSidebarCollapsed = async (collapsed: boolean): Promise<void> => {
  await setPreference(SIDEBAR_KEY, collapsed ? 'true' : 'false');
};

/** The next theme in a system → light → dark → system cycle. */
export const nextTheme = (current: Theme): Theme =>
  current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
