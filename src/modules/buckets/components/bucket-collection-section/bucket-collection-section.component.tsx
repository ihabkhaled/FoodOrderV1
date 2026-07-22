import { AppVirtuosoGrid } from '@/packages/virtuoso';
import type { MessageKey } from '@/shared/i18n';
import { VirtualListFooter } from '@/shared/ui';

import { OwnedBucketCard } from '../owned-bucket-card/owned-bucket-card.component';
import { SharedBucketCard } from '../shared-bucket-card/shared-bucket-card.component';
import type { BucketCollectionSectionProps } from './bucket-collection-section.types';

const emptyMessage = (
  kind: 'owned' | 'shared',
  query: string,
  t: (key: MessageKey) => string,
): string => {
  if (query) return t('noMatchingBuckets');
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
          useWindowScroll
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
        <p className="muted">{emptyMessage(kind, query, t)}</p>
      )}
    </section>
  );
}
