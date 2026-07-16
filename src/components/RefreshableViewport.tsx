import {
  type ReactNode,
  type TouchEvent,
  useCallback,
  useRef,
  useState,
} from 'react';

import { RefreshCw } from '@/packages/icons';
import { getViewportScrollTop } from '@/platform/browser';
import { useApp } from '@/state/AppContext';
import {
  RefreshProvider,
  useRefreshController,
} from '@/state/RefreshContext';
import type { Locale } from '@/types/domain';

const MAX_PULL = 108;
const REFRESH_THRESHOLD = 68;

const isPageAtTop = (): boolean => getViewportScrollTop() <= 0;

const refreshLabel = (
  locale: Locale,
  refreshing: boolean,
  armed: boolean,
): string => {
  if (refreshing) return locale === 'ar' ? 'جارٍ التحديث…' : 'Refreshing…';
  if (armed) return locale === 'ar' ? 'اترك للتحديث' : 'Release to refresh';
  return locale === 'ar' ? 'اسحب لأسفل للتحديث' : 'Pull down to refresh';
};

const usePullGesture = (
  available: boolean,
  refreshing: boolean,
  refresh: () => Promise<void>,
) => {
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
    if (armed) void refresh();
  }, [distance, refresh, reset]);

  return { distance, onTouchStart, onTouchMove, onTouchEnd };
};

function RefreshViewportContent({ children }: { children: ReactNode }) {
  const { locale } = useApp();
  const { available, refreshing, refresh } = useRefreshController();
  const { distance, onTouchStart, onTouchMove, onTouchEnd } = usePullGesture(
    available,
    refreshing,
    refresh,
  );
  const armed = distance >= REFRESH_THRESHOLD;
  const buttonLabel = locale === 'ar' ? 'تحديث الصفحة' : 'Refresh page';

  return (
    <div
      className="refresh-viewport"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        className={`pull-refresh-indicator${distance > 0 || refreshing ? ' visible' : ''}`}
        style={{ transform: `translateY(${refreshing ? 12 : distance - 48}px)` }}
        role="status"
        aria-live="polite"
      >
        <RefreshCw className={refreshing ? 'spinning' : ''} />
        <span>{refreshLabel(locale, refreshing, armed)}</span>
      </div>
      {available ? (
        <button
          type="button"
          className="icon-button page-refresh-button"
          onClick={() => void refresh()}
          disabled={refreshing}
          aria-label={buttonLabel}
          title={buttonLabel}
        >
          <RefreshCw className={refreshing ? 'spinning' : ''} />
        </button>
      ) : null}
      {children}
    </div>
  );
}

export function RefreshableViewport({ children }: { children: ReactNode }) {
  return (
    <RefreshProvider>
      <RefreshViewportContent>{children}</RefreshViewportContent>
    </RefreshProvider>
  );
}
