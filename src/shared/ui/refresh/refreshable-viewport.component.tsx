import { RefreshCw } from '@/packages/icons';
import { translate } from '@/shared/i18n';
import type { Locale } from '@/shared/types';

import type { RefreshableViewportViewProps } from './refreshable-viewport.types';

const refreshLabel = (locale: Locale, refreshing: boolean, armed: boolean): string => {
  if (refreshing) return translate(locale, 'refreshing');
  if (armed) return translate(locale, 'releaseToRefresh');
  return translate(locale, 'pullDownToRefresh');
};

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
  const buttonLabel = translate(locale, 'refreshPage');

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
