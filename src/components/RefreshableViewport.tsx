import { RefreshCw } from 'lucide-react';
import {
  type ReactNode,
  type TouchEvent,
  useCallback,
  useRef,
  useState,
} from 'react';

import { useApp } from '@/state/AppContext';
import {
  RefreshProvider,
  useRefreshController,
} from '@/state/RefreshContext';

const MAX_PULL = 108;
const REFRESH_THRESHOLD = 68;

function RefreshViewportContent({ children }: { children: ReactNode }) {
  const { locale } = useApp();
  const { available, refreshing, refresh } = useRefreshController();
  const startY = useRef<number | null>(null);
  const [distance, setDistance] = useState(0);

  const label = refreshing
    ? locale === 'ar'
      ? 'جارٍ التحديث…'
      : 'Refreshing…'
    : distance >= REFRESH_THRESHOLD
      ? locale === 'ar'
        ? 'اترك للتحديث'
        : 'Release to refresh'
      : locale === 'ar'
        ? 'اسحب لأسفل للتحديث'
        : 'Pull down to refresh';

  const atTop = (): boolean =>
    (document.scrollingElement?.scrollTop ?? window.scrollY) <= 0;

  const handleTouchStart = useCallback(
    (event: TouchEvent<HTMLDivElement>): void => {
      if (!available || refreshing || !atTop()) return;
      startY.current = event.touches[0]?.clientY ?? null;
    },
    [available, refreshing],
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent<HTMLDivElement>): void => {
      const origin = startY.current;
      const current = event.touches[0]?.clientY;
      if (origin === null || current === undefined) return;
      const delta = Math.max(0, current - origin);
      if (delta === 0) return;
      if (!atTop()) {
        startY.current = null;
        setDistance(0);
        return;
      }
      event.preventDefault();
      setDistance(Math.min(MAX_PULL, delta * 0.55));
    },
    [],
  );

  const completeGesture = useCallback((): void => {
    const shouldRefresh = distance >= REFRESH_THRESHOLD;
    startY.current = null;
    setDistance(0);
    if (shouldRefresh) void refresh();
  }, [distance, refresh]);

  return (
    <div
      className="refresh-viewport"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={completeGesture}
      onTouchCancel={completeGesture}
    >
      <div
        className={`pull-refresh-indicator${distance > 0 || refreshing ? ' visible' : ''}`}
        style={{ transform: `translateY(${refreshing ? 12 : distance - 48}px)` }}
        role="status"
        aria-live="polite"
      >
        <RefreshCw className={refreshing ? 'spinning' : ''} />
        <span>{label}</span>
      </div>
      {available ? (
        <button
          type="button"
          className="icon-button page-refresh-button"
          onClick={() => void refresh()}
          disabled={refreshing}
          aria-label={locale === 'ar' ? 'تحديث الصفحة' : 'Refresh page'}
          title={locale === 'ar' ? 'تحديث الصفحة' : 'Refresh page'}
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
