import type { OrderStatus } from '@/modules/data-access';
import { ClipboardList, Search } from '@/packages/icons';
import { Link } from '@/packages/router';
import { AppVirtuoso } from '@/packages/virtuoso';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Loading,
  VirtualListFooter,
} from '@/shared/ui';

import { OrderRow } from '../components/order-row/order-row.component';
import { ORDER_STATUS_FILTERS, useOrders } from '../hooks/use-orders.hook';
import { BUCKETS_REDIRECT_PATH } from '../routes/orders-route-paths.constants';

export function OrdersContainer() {
  const vm = useOrders();

  if (vm.loading) return <Loading label={vm.t('loading')} />;
  if (vm.error && vm.totalLoaded === 0) {
    return (
      <ErrorState
        retryLabel={vm.t('tryAgain')}
        message={vm.errorMessage(vm.error)}
        onRetry={() => void vm.refresh()}
      />
    );
  }

  return (
    <div className="page stack-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{vm.t('myOrders')}</p>
          <h1>{vm.t('orders')}</h1>
        </div>
      </div>

      {vm.totalLoaded > 0 ? (
        <>
          <div className="filters">
            <label className="search-field">
              <Search />
              <input
                value={vm.query}
                onChange={(event) => {
                  vm.updateParameter('q', event.target.value, '');
                }}
                placeholder={vm.t('searchOrders')}
                aria-label={vm.t('searchOrders')}
              />
            </label>
            <select
              value={vm.status}
              onChange={(event) => {
                vm.updateParameter('status', event.target.value, 'all');
              }}
              aria-label={vm.t('status')}
            >
              <option value="all">{vm.t('allStatuses')}</option>
              {ORDER_STATUS_FILTERS.slice(1).map((value) => (
                <option key={value} value={value}>
                  {vm.t(value as OrderStatus)}
                </option>
              ))}
            </select>
          </div>

          {vm.filtered.length > 0 ? (
            <section className="section-card">
              <AppVirtuoso
                className="virtual-list"
                useWindowScroll
                data={vm.filtered}
                computeItemKey={(_, order) => order.id}
                endReached={() => void vm.loadMore()}
                increaseViewportBy={320}
                itemContent={(_, order) => (
                  <div className="virtual-list-item">
                    <OrderRow
                      order={order}
                      locale={vm.locale}
                      t={vm.t}
                      onDelete={vm.setDeleting}
                    />
                  </div>
                )}
                components={{
                  Footer: () => (
                    <VirtualListFooter
                      loading={vm.loadingMore}
                      hasMore={vm.hasMore}
                      error={vm.error ? vm.errorMessage(vm.error) : ''}
                      locale={vm.locale}
                      onRetry={() => void vm.loadMore()}
                    />
                  ),
                }}
              />
            </section>
          ) : (
            <p className="muted">
              {vm.locale === 'ar'
                ? 'لا توجد طلبات مطابقة في النتائج المحمّلة.'
                : 'No matching orders in the loaded results.'}
            </p>
          )}
        </>
      ) : (
        <EmptyState
          icon={<ClipboardList />}
          title={vm.t('emptyOrders')}
          description={vm.t('ordersEmptyHint')}
          action={
            <Link className="button" to={BUCKETS_REDIRECT_PATH}>
              {vm.t('buckets')}
            </Link>
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(vm.deleting)}
        title={vm.t('delete')}
        message={vm.t('confirmDeleteOrder')}
        confirmLabel={vm.t('delete')}
        cancelLabel={vm.t('cancel')}
        danger
        onConfirm={() => void vm.remove()}
        onCancel={() => {
          vm.setDeleting(null);
        }}
      />
    </div>
  );
}
