import { type TouchEvent, useCallback, useContext, useRef, useState } from 'react';

import { getViewportScrollTop } from '@/platform/browser';

import { RefreshContext } from './refresh-context.store';

const MAX_PULL = 108;
const REFRESH_THRESHOLD = 68;

const isPageAtTop = (): boolean => getViewportScrollTop() <= 0;

export interface RefreshableViewportState {
  readonly available: boolean;
  readonly refreshing: boolean;
  readonly armed: boolean;
  readonly distance: number;
  readonly refresh: () => Promise<void>;
  readonly onTouchStart: (event: TouchEvent<HTMLDivElement>) => void;
  readonly onTouchMove: (event: TouchEvent<HTMLDivElement>) => void;
  readonly onTouchEnd: () => void;
}

/**
 * Pull-to-refresh gesture over the shared refresh controller: a downward
 * drag from the page top grows the indicator (damped, capped at MAX_PULL)
 * and releasing beyond REFRESH_THRESHOLD triggers the registered handler.
 */
export const useRefreshableViewport = (): RefreshableViewportState => {
  const context = useContext(RefreshContext);
  const available = context?.available ?? false;
  const refreshing = context?.refreshing ?? false;
  const refresh = context?.refresh;

  const startY = useRef<number | null>(null);
  const [distance, setDistance] = useState(0);

  const reset = useCallback((): void => {
    startY.current = null;
    setDistance(0);
  }, []);

  const onTouchStart = useCallback(
    (event: TouchEvent<HTMLDivElement>): void => {
      if (available && !refreshing && isPageAtTop()) {
        startY.current = event.touches[0]?.clientY ?? null;
      }
    },
    [available, refreshing],
  );

  const onTouchMove = useCallback(
    (event: TouchEvent<HTMLDivElement>): void => {
      const origin = startY.current;
      const current = event.touches[0]?.clientY;
      if (origin === null || current === undefined) return;
      if (!isPageAtTop()) {
        reset();
        return;
      }
      const delta = Math.max(0, current - origin);
      if (delta <= 0) return;
      event.preventDefault();
      setDistance(Math.min(MAX_PULL, delta * 0.55));
    },
    [reset],
  );

  const onTouchEnd = useCallback((): void => {
    const armed = distance >= REFRESH_THRESHOLD;
    reset();
    if (armed && refresh) void refresh();
  }, [distance, refresh, reset]);

  if (!refresh) {
    throw new Error('useRefreshableViewport must be used inside RefreshProvider.');
  }

  return {
    available,
    refreshing,
    armed: distance >= REFRESH_THRESHOLD,
    distance,
    refresh,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};
