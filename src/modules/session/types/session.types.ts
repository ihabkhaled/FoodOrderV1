import type { ReactNode } from 'react';

import type {
  CurrencyCode,
  Locale,
  SessionUser,
  Theme,
  UserProfile,
} from '@/modules/data-access';
import type { AnalyticsConsent } from '@/modules/telemetry';
import type { MessageKey } from '@/shared/i18n';

export interface AppProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export interface ToastState {
  message: string;
  kind: 'success' | 'error' | 'info';
}

export interface AppContextValue {
  user: SessionUser | null;
  profile: UserProfile | null;
  authLoading: boolean;
  online: boolean;
  storageMode: string;
  /** Resolved analytics consent: the profile copy wins over the device one. */
  analyticsConsent: AnalyticsConsent;
  locale: Locale;
  theme: Theme;
  currency: CurrencyCode;
  toast: ToastState | null;
  t: (key: MessageKey) => string;
  errorMessage: (error: unknown, fallbackKey?: MessageKey) => string;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  saveProfile: (
    changes: Partial<
      Pick<
        UserProfile,
        | 'fullName'
        | 'locale'
        | 'theme'
        | 'defaultCurrency'
        | 'analyticsConsent'
      >
    >,
  ) => Promise<void>;
  /** Runtime language switch that also works before signing in. */
  setDeviceLocale: (locale: Locale) => Promise<void>;
  /** Runtime theme switch that also works before signing in. */
  setDeviceTheme: (theme: Theme) => Promise<void>;
  showToast: (message: string, kind?: ToastState['kind']) => void;
}
