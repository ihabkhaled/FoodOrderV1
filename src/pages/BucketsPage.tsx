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
import type { PageResult } from '@/lib/pagination';
import { paginationService } from '@/services';
import { useApp } from '@/state/AppContext';
import { usePageRefresh } from '@/state/RefreshContext';
import type { Bucket } from '@/types/domain';

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

  const initialError =
    owned.items.length === 0 && shared.items.length === 0
      ? owned.error ?? shared.error
      : null;
  if (initialError) {
    return (
      <ErrorState
        message={errorMessage(initialError)}
        onRetry={() => void refresh()}
      />
    );
  }
  if (owned.loading && shared.loading) return <Loading />;

  const totalLoaded = owned.items.length + shared.items.length;
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

      {totalLoaded > 0 ? (
        <>
          <BucketFilters
            query={query}
            scope={scope}
            locale={locale}
            t={t}
            onQueryChange={(value) => {
              updateSearch('q', value);
            }}
            onScopeChange={(value) => {
              updateSearch('scope', value);
            }}
          />
          {scope !== 'shared' ? (
            <BucketCollectionSection
              kind="owned"
              items={filteredOwned}
              locale={locale}
              query={query}
              loadingMore={owned.loadingMore}
              hasMore={owned.hasMore}
              error={owned.error ? errorMessage(owned.error) : ''}
              t={t}
              onLoadMore={() => void owned.loadMore()}
              onRetry={() => void owned.loadMore()}
              onDuplicate={(bucket) => void duplicate(bucket)}
              onDelete={setDeleting}
            />
          ) : null}
          {scope !== 'owned' ? (
            <BucketCollectionSection
              kind="shared"
              items={filteredShared}
              locale={locale}
              query={query}
              loadingMore={shared.loadingMore}
              hasMore={shared.hasMore}
              error={shared.error ? errorMessage(shared.error) : ''}
              t={t}
              onLoadMore={() => void shared.loadMore()}
              onRetry={() => void shared.loadMore()}
              onDuplicate={() => {}}
              onDelete={() => {}}
            />
          ) : null}
        </>
      ) : (
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
      )}

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
