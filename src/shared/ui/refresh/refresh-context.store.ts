import { createContext } from 'react';

export interface RefreshContextValue {
  register: (handler: (() => Promise<void>) | null) => void;
  refreshing: boolean;
  available: boolean;
  refresh: () => Promise<void>;
}

export const RefreshContext = createContext<RefreshContextValue | null>(null);
