import { ClipboardList, Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Loading } from '@/components/Loading';
import { OrderRow } from '@/components/OrderRow';
import { VirtualListFooter } from '@/components/VirtualListFooter';
import { useCursorPage } from '@/hooks/useCursorPage';
import type { PageResult } from '@/lib/pagination';
import { AppVirtuoso } from '@/packages/virtuoso';
import { dataService, paginationService } from '@/services';
import { useApp } from '@/state/AppContext';
import { usePageRefresh } from '@/state/RefreshContext';
import type { Order, OrderStatus } from '@/types/domain';

const statuses: (OrderStatus | 'all')[] = [
  'all',
  'draft',
  'placed',
  'completed',
  'cancelled',
];

const emptyOrderPage = (): Promise<PageResult<Order>> =>
  Promise.resolve({ items: [], nextCursor: null, hasMore: false });

export function OrdersPage() {
  const { user, locale, t, showToast, errorMessage } = useApp();
  const [searchParameters, setSearchParameters] = useSearchParams();
  const [deleting, setDeleting] = useState<Order | null>(null);
  const query = searchParameters.get('q') ?? '';
  const statusParameter = searchParameters.get('status') ?? 'all';
  const status = statuses.includes(statusParameter as OrderStatus | 'all')
    ? (statusParameter as OrderStatus | 'all')
    : 'all';

  const loadOrders = useCallback(
    (request: Parameters<typeof paginationService.listOrders>[1]) =>
      user ? paginationService.listOrders(user, request) : emptyOrderPage(),
    [user],
  );
  const orders = useCursorPage(loadOrders, `orders:${user?.id ?? 'guest'}`);
  usePageRefresh(orders.refresh);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      orders.items.filter(
        (order) =>
          (status === 'all' || order.status === status) &&
          `${order.bucketTitle} ${order.notes} ${order.lines
            .map((line) => line.name)
            .join(' ')}`
            .toLowerCase()
            .includes(normalizedQuery),
      ),
    [normalizedQuery, orders.items, status],
  );

  const updateParameter = (
    key: string,
    value: string,
    emptyValue: string,
  ): void => {
    const next = new URLSearchParams(searchParameters);
    if (!value || value === emptyValue) next.delete(key);
    else next.set(key, value);
    setSearchParameters(next, { replace: true });
  };

  const remove = async (): Promise<void> => {
    if (!user || !deleting) return;
    try {
      await dataService.deleteOrder(user.id, deleting.id);
      await orders.refresh();
      showToast(t('orderDeleted'), 'success');
    } catch (error_) {
      showToast(errorMessage(error_), 'error');
    } finally {
      setDeleting(null);
    }
  };

  if (orders.loading) return <Loading />;
  if (orders.error && orders.items.length === 0) {
    return (
      <ErrorState
        message={errorMessage(orders.error)}
        onRetry={() => void orders.refresh()}
      />
    );
  }

  return (
    <div className="page stack-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t('myOrders')}</p>
          <h1>{t('orders')}</h1>
        </div>
      </div>

      {orders.items.length > 0 ? (
        <>
          <div className="filters">
            <label className="search-field">
              <Search />
              <input
                value={query}
                onChange={(event) => {
                  updateParameter('q', event.target.value, '');
                }}
                placeholder={t('searchOrders')}
                aria-label={t('searchOrders')}
              />
            </label>
            <select
              value={status}
              onChange={(event) => {
                updateParameter('status', event.target.value, 'all');
              }}
              aria-label={t('status')}
            >
              <option value="all">{t('allStatuses')}</option>
              {statuses.slice(1).map((value) => (
                <option key={value} value={value}>
                  {t(value as OrderStatus)}
                </option>
              ))}
            </select>
          </div>

          {filtered.length > 0 ? (
            <section className="section-card">
              <AppVirtuoso
                className="virtual-list"
                useWindowScroll
                data={filtered}
                computeItemKey={(_, order) => order.id}
                endReached={() => void orders.loadMore()}
                increaseViewportBy={320}
                itemContent={(_, order) => (
                  <div className="virtual-list-item">
                    <OrderRow
                      order={order}
                      locale={locale}
                      t={t}
                      onDelete={setDeleting}
                    />
                  </div>
                )}
                components={{
                  Footer: () => (
                    <VirtualListFooter
                      loading={orders.loadingMore}
                      hasMore={orders.hasMore}
                      error={orders.error ? errorMessage(orders.error) : ''}
                      locale={locale}
                      onRetry={() => void orders.loadMore()}
                    />
                  ),
                }}
              />
            </section>
          ) : (
            <p className="muted">
              {locale === 'ar'
                ? 'لا توجد طلبات مطابقة في النتائج المحمّلة.'
                : 'No matching orders in the loaded results.'}
            </p>
          )}
        </>
      ) : (
        <EmptyState
          icon={<ClipboardList />}
          title={t('emptyOrders')}
          description={t('ordersEmptyHint')}
          action={
            <Link className="button" to="/buckets">
              {t('buckets')}
            </Link>
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('delete')}
        message={t('confirmDeleteOrder')}
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
