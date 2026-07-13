import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { impact } from '@/services/platform';

interface RefreshContextValue {
  register: (handler: (() => Promise<void>) | null) => void;
  refreshing: boolean;
  available: boolean;
  refresh: () => Promise<void>;
}

const RefreshContext = createContext<RefreshContextValue | null>(null);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const handler = useRef<(() => Promise<void>) | null>(null);
  const running = useRef<Promise<void> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [available, setAvailable] = useState(false);

  const register = useCallback((next: (() => Promise<void>) | null): void => {
    handler.current = next;
    setAvailable(next !== null);
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    if (!handler.current) return;
    if (running.current) return running.current;
    setRefreshing(true);
    void impact();
    const operation = handler.current().finally(() => {
      running.current = null;
      setRefreshing(false);
    });
    running.current = operation;
    return operation;
  }, []);

  const value = useMemo(
    () => ({ register, refreshing, available, refresh }),
    [available, refresh, refreshing, register],
  );

  return (
    <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>
  );
}

export const usePageRefresh = (handler: () => Promise<void>): void => {
  const context = useContext(RefreshContext);
  useEffect(() => {
    context?.register(handler);
    return () => {
      context?.register(null);
    };
  }, [context, handler]);
};

export const useRefreshController = (): RefreshContextValue => {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useRefreshController must be used inside RefreshProvider.');
  }
  return context;
};
