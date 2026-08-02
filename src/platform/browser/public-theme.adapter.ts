import type { ThemePreference } from './document-settings.types';

/** Explicit reader choice for the public site; absent means "follow the OS". */
export type PublicThemeChoice = Exclude<ThemePreference, 'system'>;

/**
 * Kept apart from the signed-in app's preference on purpose: a reader browsing
 * the marketing pages has no account, and the two surfaces are styled by
 * different sheets. The prerendered pages read the same key from an inline
 * script before first paint, so the stored choice must stay a plain string.
 */
export const PUBLIC_THEME_STORAGE_KEY = 'foodorder:public:theme';

const isChoice = (value: unknown): value is PublicThemeChoice =>
  value === 'light' || value === 'dark';

export const loadPublicThemeChoice = (): PublicThemeChoice | null => {
  try {
    const stored = localStorage.getItem(PUBLIC_THEME_STORAGE_KEY);
    return isChoice(stored) ? stored : null;
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); the reader
    // simply follows the operating system for this visit.
    return null;
  }
};

export const savePublicThemeChoice = (choice: PublicThemeChoice): void => {
  try {
    localStorage.setItem(PUBLIC_THEME_STORAGE_KEY, choice);
  } catch {
    // A theme that cannot be remembered still applies to this page.
  }
};

/** What the reader currently sees, whether chosen or inherited from the OS. */
export const resolvePublicTheme = (): PublicThemeChoice => {
  const attribute = document.documentElement.dataset['theme'];
  if (isChoice(attribute)) return attribute;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const applyPublicTheme = (choice: PublicThemeChoice): void => {
  document.documentElement.dataset['theme'] = choice;
};
