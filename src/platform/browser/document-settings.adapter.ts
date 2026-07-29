import type { ThemePreference } from './document-settings.types';

export const applyDocumentTheme = (theme: ThemePreference): void => {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset['theme'] = isDark ? 'dark' : 'light';
};

/**
 * Notifies the listener when the OS-level colour scheme flips so a 'system'
 * theme preference can re-resolve without a reload.
 */
export const subscribeToColorSchemeChange = (
  listener: () => void,
): (() => void) => {
  const query = matchMedia('(prefers-color-scheme: dark)');
  query.addEventListener('change', listener);
  return () => {
    query.removeEventListener('change', listener);
  };
};

export const applyDocumentLocale = (locale: string, direction: 'ltr' | 'rtl'): void => {
  document.documentElement.lang = locale;
  document.documentElement.dir = direction;
};

export const getDocumentLanguage = (): string => document.documentElement.lang;
