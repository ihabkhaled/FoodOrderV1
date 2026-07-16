import type { ThemePreference } from './document-settings.types';

export const applyDocumentTheme = (theme: ThemePreference): void => {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
};

export const applyDocumentLocale = (locale: string, direction: 'ltr' | 'rtl'): void => {
  document.documentElement.lang = locale;
  document.documentElement.dir = direction;
};

export const getDocumentLanguage = (): string => document.documentElement.lang;
