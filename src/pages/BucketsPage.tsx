import { KeyRound, Plus, Search, ShoppingBasket } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  OwnedBucketCard,
  SharedBucketCard,
} from '@/components/BucketCards';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Loading } from '@/components/Loading';
import { VirtualListFooter } from '@/components/VirtualListFooter';
import { useCursorPage } from '@/hooks/useCursorPage';
import { AppVirtuosoGrid } from '@/packages/virtuoso';
import { dataService, paginationService } from '@/services';
import { useApp } from '@/state/AppContext';
import { usePageRefresh } from '@/state/RefreshContext';
import type { Bucket } from '@/types/domain';

const emptyBucketPage = async () => ({
  items: [] as Bucket[],
  nextCursor: null,
  hasMore: false,
});

export function BucketsPage() {
  const { user, locale, t, showToast, errorMessage } = useApp();
  const [searchParameters, setSearchParameters] = useSearchParams();
  const [deleting, setDeleting] = useState<Bucket | null>(null);
  const query = searchParameters.get('q') ?? '';
  const scope = searchParameters.get('scope') ?? 'all';

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

  const refresh = useCallback(async (): Promise<void> => {
    await Promise.all([owned.refresh(), shared.refresh()]);
  }, [owned.refresh, shared.refresh]);
  usePageRefresh(refresh);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOwned = useMemo(
    () =>
      owned.items.filter((bucket) =>
        `${bucket.title} ${bucket.description}`
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    [normalizedQuery, owned.items],
  );
  const filteredShared = useMemo(
    () =>
      shared.items.filter((bucket) =>
        `${bucket.title} ${bucket.description}`
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    [normalizedQuery, shared.items],
  );

  const setQuery = (value: string): void => {
    const next = new URLSearchParams(searchParameters);
    if (value) next.set('q', value);
    else next.delete('q');
    setSearchParameters(next, { replace: true });
  };

  const setScope = (value: string): void => {
    const next = new URLSearchParams(searchParameters);
    if (value === 'all') next.delete('scope');
    else next.set('scope', value);
    setSearchParameters(next, { replace: true });
  };

  const remove = async (): Promise<void> => {
    if (!user || !deleting) return;
    try {
      await dataService.deleteBucket(user, deleting.id);
      await owned.refresh();
      showToast(t('bucketDeleted'), 'success');
    } catch (error_) {
      showToast(errorMessage(error_), 'error');
    } finally {
      setDeleting(null);
    }
  };

  const duplicate = async (bucket: Bucket): Promise<void> => {
    if (!user) return;
    try {
      await dataService.createBucket(user, {
        title: `${bucket.title} (${t('copySuffix')})`.slice(0, 60),
        description: bucket.description,
        currency: bucket.currency,
        items: bucket.items.map(
          ({ name, description, category, unitPrice, active, sortOrder }) => ({
            id: '',
            name,
            description,
            category,
            unitPrice,
            active,
            sortOrder,
          }),
        ),
      });
      await owned.refresh();
      showToast(t('bucketSaved'), 'success');
    } catch (error_) {
      showToast(errorMessage(error_), 'error');
    }
  };

  const initialLoading = owned.loading && shared.loading;
  const initialError =
    owned.items.length === 0 && shared.items.length === 0
      ? owned.error ?? shared.error
      : null;
  if (initialError) {
    return <ErrorState message={errorMessage(initialError)} onRetry={() => void refresh()} />;
  }
  if (initialLoading) return <Loading />;

  const showOwned = scope !== 'shared';
  const showShared = scope !== 'owned';
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
          <label className="search-field">
            <Search />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder={t('searchBuckets')}
              aria-label={t('searchBuckets')}
            />
          </label>
          <div className="filter-tabs" role="group" aria-label={t('buckets')}>
            {['all', 'owned', 'shared'].map((value) => (
              <button
                type="button"
                key={value}
                className={scope === value ? 'active' : ''}
                onClick={() => {
                  setScope(value);
                }}
              >
                {value === 'all'
                  ? locale === 'ar'
                    ? 'الكل'
                    : 'All'
                  : value === 'owned'
                    ? t('myBuckets')
                    : t('sharedWithMe')}
              </button>
            ))}
          </div>

          {showOwned ? (
            <section className="stack" aria-labelledby="owned-buckets-heading">
              <div className="section-heading">
                <h2 id="owned-buckets-heading">{t('myBuckets')}</h2>
              </div>
              {filteredOwned.length > 0 ? (
                <AppVirtuosoGrid
                  className="virtual-grid-list"
                  data={filteredOwned}
                  computeItemKey={(_, bucket) => bucket.id}
                  listClassName="virtual-grid"
                  itemClassName="virtual-list-item"
                  endReached={() => void owned.loadMore()}
                  increaseViewportBy={320}
                  itemContent={(_, bucket) => (
                    <OwnedBucketCard
                      bucket={bucket}
                      locale={locale}
                      t={t}
                      onDuplicate={(value) => void duplicate(value)}
                      onDelete={setDeleting}
                    />
                  )}
                  components={{
                    Footer: () => (
                      <VirtualListFooter
                        loading={owned.loadingMore}
                        hasMore={owned.hasMore}
                        error={owned.error ? errorMessage(owned.error) : ''}
                        locale={locale}
                        onRetry={() => void owned.loadMore()}
                      />
                    ),
                  }}
                />
              ) : (
                <p className="muted">
                  {query
                    ? locale === 'ar'
                      ? 'لا توجد نتائج مطابقة في القوائم المحمّلة.'
                      : 'No matching results in the loaded buckets.'
                    : t('emptyBuckets')}
                </p>
              )}
            </section>
          ) : null}

          {showShared ? (
            <section className="stack" aria-labelledby="shared-buckets-heading">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{t('sharedWithMe')}</p>
                  <h2 id="shared-buckets-heading">{t('sharedWithMe')}</h2>
                </div>
              </div>
              {filteredShared.length > 0 ? (
                <AppVirtuosoGrid
                  className="virtual-grid-list"
                  data={filteredShared}
                  computeItemKey={(_, bucket) => bucket.id}
                  listClassName="virtual-grid"
                  itemClassName="virtual-list-item"
                  endReached={() => void shared.loadMore()}
                  increaseViewportBy={320}
                  itemContent={(_, bucket) => (
                    <SharedBucketCard bucket={bucket} locale={locale} t={t} />
                  )}
                  components={{
                    Footer: () => (
                      <VirtualListFooter
                        loading={shared.loadingMore}
                        hasMore={shared.hasMore}
                        error={shared.error ? errorMessage(shared.error) : ''}
                        locale={locale}
                        onRetry={() => void shared.loadMore()}
                      />
                    ),
                  }}
                />
              ) : (
                <p className="muted">
                  {t('emptyShared')} {t('emptySharedHint')}
                </p>
              )}
            </section>
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
