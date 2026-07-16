import { useLocation } from '@/packages/router';

interface NavigationState {
  readonly from?: unknown;
}

const isSafeInternalPath = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');

/**
 * Resolves the back-navigation target: the `from` navigation state when it is
 * a safe internal path different from the current screen, else the fallback.
 */
export const useBackLink = (fallback: string): string => {
  const location = useLocation();
  const state = location.state as NavigationState | null;
  const origin = state?.from;
  return isSafeInternalPath(origin) && origin !== location.pathname
    ? origin
    : fallback;
};
