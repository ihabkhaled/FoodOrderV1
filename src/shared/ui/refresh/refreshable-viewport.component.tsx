import type { ReactNode, TouchEvent } from 'react';

import { RefreshCw } from '@/packages/icons';
import type { Locale } from '@/shared/types';

const refreshLabel = (locale: Locale, refreshing: boolean, armed: boolean): string => {
  if (refreshing) return locale === 'ar' ? 'جارٍ التحديث…' : 'Refreshing…';
  if (armed) return locale === 'ar' ? 'اترك للتحديث' : 'Release to refresh';
  return locale === 'ar' ? 'اسحب لأسفل للتحديث' : 'Pull down to refresh';
};

interface RefreshableViewportViewProps {
  readonly locale: Locale;
  readonly available: boolean;
  readonly refreshing: boolean;
  readonly armed: boolean;
  readonly distance: number;
  readonly refresh: () => Promise<void>;
  readonly onTouchStart: (event: TouchEvent<HTMLDivElement>) => void;
  readonly onTouchMove: (event: TouchEvent<HTMLDivElement>) => void;
  readonly onTouchEnd: () => void;
  readonly children: ReactNode;
}

export function RefreshableViewportView({
  locale,
  available,
  refreshing,
  armed,
  distance,
  refresh,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  children,
}: RefreshableViewportViewProps) {
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
