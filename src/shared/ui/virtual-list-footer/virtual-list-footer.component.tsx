import { translate } from '@/shared/i18n';

import type { VirtualListFooterProps } from './virtual-list-footer.types';

export function VirtualListFooter({
  loading,
  hasMore,
  error,
  locale,
  onRetry,
}: VirtualListFooterProps) {
  if (error) {
    return (
      <div className="virtual-list-footer" role="alert">
        <span>{error}</span>
        <button type="button" className="button secondary" onClick={onRetry}>
          {translate(locale, 'tryAgain')}
        </button>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="virtual-list-footer" role="status">
        {translate(locale, 'loadingMore')}
      </div>
    );
  }
  if (!hasMore) {
    return (
      <div className="virtual-list-footer">
        {translate(locale, 'allResultsLoaded')}
      </div>
    );
  }
  return <div className="virtual-list-footer" aria-hidden="true" />;
}
