import { useCallback, useEffect, useState } from 'react';

import type { PublicThemeChoice } from '@/platform/browser';
import {
  applyPublicTheme,
  loadPublicThemeChoice,
  resolvePublicTheme,
  savePublicThemeChoice,
  subscribeToColorSchemeChange,
} from '@/platform/browser';

export interface PublicThemeViewModel {
  /** What the reader currently sees, chosen or inherited from the OS. */
  theme: PublicThemeChoice;
  toggleTheme: () => void;
}

/**
 * Light/dark control for the public site.
 *
 * The prerendered pages already apply a stored choice from an inline script
 * before first paint, so this hook adopts whatever the document is showing
 * rather than imposing a default and causing a flash. With no stored choice the
 * operating system decides, and a later OS change is followed live.
 */
export function usePublicTheme(): PublicThemeViewModel {
  const [theme, setTheme] = useState<PublicThemeChoice>('light');

  useEffect(() => {
    setTheme(resolvePublicTheme());
  }, []);

  useEffect(
    () =>
      subscribeToColorSchemeChange(() => {
        if (loadPublicThemeChoice() === null) setTheme(resolvePublicTheme());
      }),
    [],
  );

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: PublicThemeChoice = current === 'dark' ? 'light' : 'dark';
      applyPublicTheme(next);
      savePublicThemeChoice(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
