import { useCallback, useMemo, useState } from 'react';

import type { Locale, Order, OrderStatus } from '@/modules/data-access';
import {
  dataService,
  paginationService,
  useCursorPage,
} from '@/modules/data-access';
import { useApp } from '@/modules/session';
import { useSearchParams } from '@/packages/router';
import type { PageResult } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';
import { usePageRefresh } from '@/shared/ui';

export const ORDER_STATUS_FILTERS: (OrderStatus | 'all')[] = [
  'all',
  'draft',
  'placed',
  'completed',
  'cancelled',
];

const emptyOrderPage = (): Promise<PageResult<Order>> =>
  Promise.resolve({ items: [], nextCursor: null, hasMore: false });

export interface OrdersViewModel {
  t: (key: MessageKey) => string;
  locale: Locale;
  errorMessage: (error: unknown) => string;
  query: string;
  status: OrderStatus | 'all';
  updateParameter: (key: string, value: string, emptyValue: string) => void;
  totalLoaded: number;
  filtered: Order[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: unknown;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  deleting: Order | null;
  setDeleting: (order: Order | null) => void;
  remove: () => Promise<void>;
}

export function useOrders(): OrdersViewModel {
  const { user, locale, t, showToast, errorMessage } = useApp();
  const [searchParameters, setSearchParameters] = useSearchParams();
  const [deleting, setDeleting] = useState<Order | null>(null);
  const query = searchParameters.get('q') ?? '';
  const statusParameter = searchParameters.get('status') ?? 'all';
  const status = ORDER_STATUS_FILTERS.includes(
    statusParameter as OrderStatus | 'all',
  )
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

  return {
    t,
    locale,
    errorMessage,
    query,
    status,
    updateParameter,
    totalLoaded: orders.items.length,
    filtered,
    loading: orders.loading,
    loadingMore: orders.loadingMore,
    hasMore: orders.hasMore,
    error: orders.error,
    refresh: orders.refresh,
    loadMore: orders.loadMore,
    deleting,
    setDeleting,
    remove,
  };
}
