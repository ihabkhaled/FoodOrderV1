interface VirtualListFooterProps {
  readonly loading: boolean;
  readonly hasMore: boolean;
  readonly error: string;
  readonly locale: 'en' | 'ar';
  readonly onRetry: () => void;
}

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
          {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
        </button>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="virtual-list-footer" role="status">
        {locale === 'ar' ? 'جارٍ تحميل المزيد…' : 'Loading more…'}
      </div>
    );
  }
  if (!hasMore) {
    return (
      <div className="virtual-list-footer">
        {locale === 'ar' ? 'تم تحميل كل النتائج.' : 'All results loaded.'}
      </div>
    );
  }
  return <div className="virtual-list-footer" aria-hidden="true" />;
}
