import {
  CheckCircle2,
  ClipboardList,
  Plus,
  ShoppingBasket,
  Users,
  Utensils,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/ErrorState';
import { Loading } from '@/components/Loading';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDateTime } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { dataService } from '@/services';
import { useApp } from '@/state/AppContext';
import { usePageRefresh } from '@/state/RefreshContext';
import type { DashboardSummary } from '@/types/domain';

export function DashboardPage() {
  const { user, profile, locale, t, errorMessage } = useApp();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      setError(null);
      setSummary(await dataService.getDashboard(user));
    } catch (error_) {
      setError(error_);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);
  usePageRefresh(load);

  if (error) {
    return <ErrorState message={errorMessage(error)} onRetry={() => void load()} />;
  }
  if (!summary) return <Loading />;

  const cards = [
    {
      label: t('bucketCount'),
      value: summary.bucketCount,
      icon: ShoppingBasket,
      to: '/buckets?scope=owned',
    },
    {
      label: t('sharedBucketCount'),
      value: summary.sharedBucketCount,
      icon: Users,
      to: '/buckets?scope=shared',
    },
    {
      label: t('itemCount'),
      value: summary.activeItemCount,
      icon: Utensils,
      to: '/buckets?scope=owned',
    },
    {
      label: t('orderCount'),
      value: summary.orderCount,
      icon: ClipboardList,
      to: '/orders',
    },
    {
      label: t('placedCount'),
      value: summary.placedOrderCount,
      icon: CheckCircle2,
      to: '/orders?status=placed',
    },
    {
      label:
        locale === 'ar' ? 'الطلبات المكتملة' : 'Completed orders',
      value: summary.completedOrderCount,
      icon: CheckCircle2,
      to: '/orders?status=completed',
    },
  ];

  return (
    <div className="page stack-lg">
      <section className="hero-card">
        <div>
          <p className="eyebrow">{t('welcome')}</p>
          <h1>{profile?.fullName ?? user?.displayName}</h1>
          <p>{t('quickStart')}</p>
        </div>
        <Link className="button" to="/buckets/new">
          <Plus />
          {t('createBucket')}
        </Link>
      </section>

      <section className="stat-grid" aria-label={t('dashboard')}>
        {cards.map(({ label, value, icon: Icon, to }) => (
          <Link className="stat-card stat-card-link" key={label} to={to}>
            <Icon />
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </Link>
        ))}
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t('recentOrders')}</p>
            <h2>{t('myOrders')}</h2>
          </div>
          <Link to="/orders">{t('orders')}</Link>
        </div>
        {summary.recentOrders.length > 0 ? (
          <div className="list">
            {summary.recentOrders.map((order) => (
              <Link
                to={`/orders/${order.id}`}
                className="list-row"
                key={order.id}
              >
                <div>
                  <strong>{order.bucketTitle}</strong>
                  <span>{formatDateTime(order.createdAt, locale)}</span>
                </div>
                <div className="row-end">
                  <StatusBadge status={order.status} />
                  <strong>
                    {formatMoney(order.total, order.currency, locale)}
                  </strong>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted">{t('emptyOrders')}</p>
        )}
      </section>
    </div>
  );
}
