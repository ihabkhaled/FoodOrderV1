import type { ReactNode } from 'react';

import { useSessionController } from '../hooks/use-session-controller.hook';
import { AppContext } from '../store/session-context.store';

export function AppProvider({ children }: { children: ReactNode }) {
  const value = useSessionController();
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
