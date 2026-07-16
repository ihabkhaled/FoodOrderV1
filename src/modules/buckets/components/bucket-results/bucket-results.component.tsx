import type { Bucket, Locale } from '@/modules/data-access';
import { Plus, ShoppingBasket } from '@/packages/icons';
import { Link } from '@/packages/router';
import type { MessageKey } from '@/shared/i18n';
import { EmptyState } from '@/shared/ui';

import { BUCKET_NEW_PATH } from '../../routes/buckets-route-paths.constants';
import { BucketCollectionSection } from '../bucket-collection-section/bucket-collection-section.component';
import type { BucketScope } from '../bucket-filters/bucket-filters.component';
import { BucketFilters } from '../bucket-filters/bucket-filters.component';

interface BucketResultsProps {
  readonly totalLoaded: number;
  readonly query: string;
  readonly scope: BucketScope;
  readonly locale: Locale;
  readonly t: (key: MessageKey) => string;
  readonly ownedItems: Bucket[];
  readonly sharedItems: Bucket[];
  readonly ownedLoadingMore: boolean;
  readonly sharedLoadingMore: boolean;
  readonly ownedHasMore: boolean;
  readonly sharedHasMore: boolean;
  readonly ownedError: string;
  readonly sharedError: string;
  readonly onQueryChange: (value: string) => void;
  readonly onScopeChange: (value: BucketScope) => void;
  readonly onOwnedLoadMore: () => void;
  readonly onSharedLoadMore: () => void;
  readonly onDuplicate: (bucket: Bucket) => void;
  readonly onDelete: (bucket: Bucket) => void;
}

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
