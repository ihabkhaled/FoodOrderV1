import type { ReactNode } from 'react';

import { RefreshContext } from '../refresh-context.store';
import { useRefreshController } from '../use-refresh-controller.hook';

export function RefreshProvider({ children }: { children: ReactNode }) {
  const value = useRefreshController();
  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>;
}
