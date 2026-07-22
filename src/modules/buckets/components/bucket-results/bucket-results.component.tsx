import { Plus, ShoppingBasket } from '@/packages/icons';
import { Link } from '@/packages/router';
import { EmptyState } from '@/shared/ui';

import { BUCKET_NEW_PATH } from '../../routes/buckets-route-paths.constants';
import { BucketCollectionSection } from '../bucket-collection-section/bucket-collection-section.component';
import { BucketFilters } from '../bucket-filters/bucket-filters.component';
import type { BucketResultsProps } from './bucket-results.types';

export function BucketResults({
  totalLoaded,
  query,
  scope,
  locale,
  t,
  ownedItems,
  sharedItems,
  ownedLoadingMore,
  sharedLoadingMore,
  ownedHasMore,
  sharedHasMore,
  ownedError,
  sharedError,
  onQueryChange,
  onScopeChange,
  onOwnedLoadMore,
  onSharedLoadMore,
  onDuplicate,
  onDelete,
}: BucketResultsProps) {
  if (totalLoaded === 0) {
    return (
      <EmptyState
        icon={<ShoppingBasket />}
        title={t('emptyBuckets')}
        description={t('quickStart')}
        action={
          <Link className="button" to={BUCKET_NEW_PATH}>
            <Plus />
            {t('createBucket')}
          </Link>
        }
      />
    );
  }

  return (
    <>
      <BucketFilters
        query={query}
        scope={scope}
        locale={locale}
        t={t}
        onQueryChange={onQueryChange}
        onScopeChange={onScopeChange}
      />
      {scope === 'shared' ? null : (
        <BucketCollectionSection
          kind="owned"
          items={ownedItems}
          locale={locale}
          query={query}
          loadingMore={ownedLoadingMore}
          hasMore={ownedHasMore}
          error={ownedError}
          t={t}
          onLoadMore={onOwnedLoadMore}
          onRetry={onOwnedLoadMore}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      )}
      {scope === 'owned' ? null : (
        <BucketCollectionSection
          kind="shared"
          items={sharedItems}
          locale={locale}
          query={query}
          loadingMore={sharedLoadingMore}
          hasMore={sharedHasMore}
          error={sharedError}
          t={t}
          onLoadMore={onSharedLoadMore}
          onRetry={onSharedLoadMore}
          onDuplicate={() => {}}
          onDelete={() => {}}
        />
      )}
    </>
  );
}
