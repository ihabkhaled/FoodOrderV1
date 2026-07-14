import { KeyRound, Plus, ShoppingBasket } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { BucketCollectionSection } from '@/components/BucketCollectionSection';
import {
  BucketFilters,
  type BucketScope,
} from '@/components/BucketFilters';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Loading } from '@/components/Loading';
import { useBucketMutations } from '@/hooks/useBucketMutations';
import { useCursorPage } from '@/hooks/useCursorPage';
import type { MessageKey } from '@/i18n/messages';
import type { PageResult } from '@/lib/pagination';
import { paginationService } from '@/services';
import { useApp } from '@/state/AppContext';
import { usePageRefresh } from '@/state/RefreshContext';
import type { Bucket, Locale } from '@/types/domain';

const emptyBucketPage = (): Promise<PageResult<Bucket>> =>
  Promise.resolve({ items: [], nextCursor: null, hasMore: false });

const readScope = (value: string | null): BucketScope =>
  value === 'owned' || value === 'shared' ? value : 'all';

const filterBuckets = (buckets: readonly Bucket[], query: string): Bucket[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...buckets];
  return buckets.filter((bucket) =>
    `${bucket.title} ${bucket.description}`.toLowerCase().includes(normalized),
  );
};

const firstPageError = (
  ownedCount: number,
  sharedCount: number,
  ownedError: unknown,
  sharedError: unknown,
): unknown =>
  ownedCount === 0 && sharedCount === 0
    ? ownedError ?? sharedError ?? null
    : null;

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

function BucketResults({
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
          <Link className="button" to="/buckets/new">
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

export function BucketsPage() {
  const { user, locale, t, showToast, errorMessage } = useApp();
  const [searchParameters, setSearchParameters] = useSearchParams();
  const query = searchParameters.get('q') ?? '';
  const scope = readScope(searchParameters.get('scope'));

  const loadOwned = useCallback(
    (request: Parameters<typeof paginationService.listOwnedBuckets>[1]) =>
      user
        ? paginationService.listOwnedBuckets(user, request)
        : emptyBucketPage(),
    [user],
  );
  const loadShared = useCallback(
    (request: Parameters<typeof paginationService.listSharedBuckets>[1]) =>
      user
        ? paginationService.listSharedBuckets(user, request)
        : emptyBucketPage(),
    [user],
  );
  const owned = useCursorPage(loadOwned, `owned:${user?.id ?? 'guest'}`);
  const shared = useCursorPage(loadShared, `shared:${user?.id ?? 'guest'}`);
  const refreshOwned = owned.refresh;
  const refreshShared = shared.refresh;
  const refresh = useCallback(
    async (): Promise<void> => {
      await Promise.all([refreshOwned(), refreshShared()]);
    },
    [refreshOwned, refreshShared],
  );
  usePageRefresh(refresh);

  const { deleting, setDeleting, remove, duplicate } = useBucketMutations({
    user,
    t,
    showToast,
    errorMessage,
    refresh: refreshOwned,
  });
  const filteredOwned = useMemo(
    () => filterBuckets(owned.items, query),
    [owned.items, query],
  );
  const filteredShared = useMemo(
    () => filterBuckets(shared.items, query),
    [query, shared.items],
  );

  const updateSearch = (key: 'q' | 'scope', value: string): void => {
    const next = new URLSearchParams(searchParameters);
    const defaultValue = key === 'scope' ? 'all' : '';
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    setSearchParameters(next, { replace: true });
  };

  const initialError = firstPageError(
    owned.items.length,
    shared.items.length,
    owned.error,
    shared.error,
  );
  if (initialError) {
    return (
      <ErrorState
        message={errorMessage(initialError)}
        onRetry={() => void refresh()}
      />
    );
  }
  if (owned.loading && shared.loading) return <Loading />;

  return (
    <div className="page stack-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t('myBuckets')}</p>
          <h1>{t('buckets')}</h1>
        </div>
        <div className="row-actions">
          <Link className="button secondary" to="/join">
            <KeyRound />
            {t('joinWithCode')}
          </Link>
          <Link className="button" to="/buckets/new">
            <Plus />
            {t('createBucket')}
          </Link>
        </div>
      </div>

      <BucketResults
        totalLoaded={owned.items.length + shared.items.length}
        query={query}
        scope={scope}
        locale={locale}
        t={t}
        ownedItems={filteredOwned}
        sharedItems={filteredShared}
        ownedLoadingMore={owned.loadingMore}
        sharedLoadingMore={shared.loadingMore}
        ownedHasMore={owned.hasMore}
        sharedHasMore={shared.hasMore}
        ownedError={owned.error ? errorMessage(owned.error) : ''}
        sharedError={shared.error ? errorMessage(shared.error) : ''}
        onQueryChange={(value) => {
          updateSearch('q', value);
        }}
        onScopeChange={(value) => {
          updateSearch('scope', value);
        }}
        onOwnedLoadMore={() => void owned.loadMore()}
        onSharedLoadMore={() => void shared.loadMore()}
        onDuplicate={(bucket) => void duplicate(bucket)}
        onDelete={setDeleting}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('delete')}
        message={
          deleting?.visibility === 'shared'
            ? t('confirmDeleteSharedBucket')
            : t('confirmDeleteBucket')
        }
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        danger
        onConfirm={() => void remove()}
        onCancel={() => {
          setDeleting(null);
        }}
      />
    </div>
  );
}
