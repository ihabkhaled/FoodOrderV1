import { useCallback, useMemo } from 'react';

import type { Bucket, Locale } from '@/modules/data-access';
import { paginationService, useCursorPage } from '@/modules/data-access';
import { useApp } from '@/modules/session';
import { useSearchParams } from '@/packages/router';
import type { PageResult } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';
import { usePageRefresh } from '@/shared/ui';

import type { BucketScope } from '../components/bucket-filters/bucket-filters.component';
import { useBucketMutations } from './use-bucket-mutations.hook';

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
    ? (ownedError ?? sharedError ?? null)
    : null;

export interface BucketsViewModel {
  t: (key: MessageKey) => string;
  locale: Locale;
  errorMessage: (error: unknown) => string;
  query: string;
  scope: BucketScope;
  updateSearch: (key: 'q' | 'scope', value: string) => void;
  loading: boolean;
  initialError: unknown;
  refresh: () => Promise<void>;
  totalLoaded: number;
  filteredOwned: Bucket[];
  filteredShared: Bucket[];
  ownedLoadingMore: boolean;
  sharedLoadingMore: boolean;
  ownedHasMore: boolean;
  sharedHasMore: boolean;
  ownedError: unknown;
  sharedError: unknown;
  ownedLoadMore: () => Promise<void>;
  sharedLoadMore: () => Promise<void>;
  deleting: Bucket | null;
  setDeleting: (bucket: Bucket | null) => void;
  remove: () => Promise<void>;
  duplicate: (bucket: Bucket) => Promise<void>;
}

export function useBuckets(): BucketsViewModel {
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
  const refresh = useCallback(async (): Promise<void> => {
    await Promise.all([refreshOwned(), refreshShared()]);
  }, [refreshOwned, refreshShared]);
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

  return {
    t,
    locale,
    errorMessage,
    query,
    scope,
    updateSearch,
    loading: owned.loading && shared.loading,
    initialError,
    refresh,
    totalLoaded: owned.items.length + shared.items.length,
    filteredOwned,
    filteredShared,
    ownedLoadingMore: owned.loadingMore,
    sharedLoadingMore: shared.loadingMore,
    ownedHasMore: owned.hasMore,
    sharedHasMore: shared.hasMore,
    ownedError: owned.error,
    sharedError: shared.error,
    ownedLoadMore: owned.loadMore,
    sharedLoadMore: shared.loadMore,
    deleting,
    setDeleting,
    remove,
    duplicate,
  };
}
