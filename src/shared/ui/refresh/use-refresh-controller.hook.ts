import { useCallback, useMemo, useRef, useState } from 'react';

import { impact } from '@/platform/device';

import type { RefreshContextValue } from './refresh-context.store';

/**
 * State machine behind {@link RefreshProvider}: pages register a single
 * refresh handler; the viewport triggers it with haptic feedback while
 * concurrent triggers share the in-flight operation.
 */
export const useRefreshController = (): RefreshContextValue => {
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

  return useMemo(
    () => ({ register, refreshing, available, refresh }),
    [available, refresh, refreshing, register],
  );
};
