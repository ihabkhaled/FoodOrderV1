import type {
  CurrencyCode,
  Locale,
  SessionUser,
  Theme,
  UserProfile,
} from '@/modules/data-access';
import type { MessageKey } from '@/shared/i18n';

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
      Pick<UserProfile, 'fullName' | 'locale' | 'theme' | 'defaultCurrency'>
    >,
  ) => Promise<void>;
  /** Runtime language switch that also works before signing in. */
  setDeviceLocale: (locale: Locale) => Promise<void>;
  /** Runtime theme switch that also works before signing in. */
  setDeviceTheme: (theme: Theme) => Promise<void>;
  showToast: (message: string, kind?: ToastState['kind']) => void;
}
