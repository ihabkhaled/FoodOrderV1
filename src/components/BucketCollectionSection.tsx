import {
  OwnedBucketCard,
  SharedBucketCard,
} from '@/components/BucketCards';
import type { Bucket, Locale } from '@/modules/data-access';
import { AppVirtuosoGrid } from '@/packages/virtuoso';
import type { MessageKey } from '@/shared/i18n';
import { VirtualListFooter } from '@/shared/ui';

interface BucketCollectionSectionProps {
  readonly kind: 'owned' | 'shared';
  readonly items: Bucket[];
  readonly locale: Locale;
  readonly query: string;
  readonly loadingMore: boolean;
  readonly hasMore: boolean;
  readonly error: string;
  readonly t: (key: MessageKey) => string;
  readonly onLoadMore: () => void;
  readonly onRetry: () => void;
  readonly onDuplicate: (bucket: Bucket) => void;
  readonly onDelete: (bucket: Bucket) => void;
}

const emptyMessage = (
  kind: 'owned' | 'shared',
  query: string,
  locale: Locale,
  t: (key: MessageKey) => string,
): string => {
  if (query) {
    return locale === 'ar'
      ? 'لا توجد نتائج مطابقة في القوائم المحمّلة.'
      : 'No matching results in the loaded buckets.';
  }
  return kind === 'owned'
    ? t('emptyBuckets')
    : `${t('emptyShared')} ${t('emptySharedHint')}`;
};

export function BucketCollectionSection({
  kind,
  items,
  locale,
  query,
  loadingMore,
  hasMore,
  error,
  t,
  onLoadMore,
  onRetry,
  onDuplicate,
  onDelete,
}: BucketCollectionSectionProps) {
  const shared = kind === 'shared';
  const headingId = `${kind}-buckets-heading`;
  const heading = shared ? t('sharedWithMe') : t('myBuckets');

  return (
    <section className="stack" aria-labelledby={headingId}>
      <div className="section-heading">
        <div>
          {shared ? <p className="eyebrow">{t('sharedWithMe')}</p> : null}
          <h2 id={headingId}>{heading}</h2>
        </div>
      </div>
      {items.length > 0 ? (
        <AppVirtuosoGrid
          className="virtual-grid-list"
          data={items}
          computeItemKey={(_, bucket) => bucket.id}
          listClassName="virtual-grid"
          itemClassName="virtual-list-item"
          endReached={onLoadMore}
          increaseViewportBy={320}
          itemContent={(_, bucket) =>
            shared ? (
              <SharedBucketCard bucket={bucket} locale={locale} t={t} />
            ) : (
              <OwnedBucketCard
                bucket={bucket}
                locale={locale}
                t={t}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            )
          }
          components={{
            Footer: () => (
              <VirtualListFooter
                loading={loadingMore}
                hasMore={hasMore}
                error={error}
                locale={locale}
                onRetry={onRetry}
              />
            ),
          }}
        />
      ) : (
        <p className="muted">{emptyMessage(kind, query, locale, t)}</p>
      )}
    </section>
  );
}
