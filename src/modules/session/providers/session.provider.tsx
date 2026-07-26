import { useSessionController } from '../hooks/use-session-controller.hook';
import { AppContext } from '../store/session-context.store';
import type { AppProviderProps } from '../types/session.types';

export function AppProvider({ children, initialLocale }: AppProviderProps) {
  const value = useSessionController(initialLocale);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
