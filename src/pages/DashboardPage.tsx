import { CheckCircle2, ClipboardList, Plus, ShoppingBasket, Users, Utensils } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDateTime } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { dataService } from '@/services';
import { useApp } from '@/state/AppContext';
import type { DashboardSummary } from '@/types/domain';
import { ErrorState } from '@/components/ErrorState';
import { Loading } from '@/components/Loading';
import { StatusBadge } from '@/components/StatusBadge';

export function DashboardPage() {
  const { user, profile, locale, t } = useApp();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!user) return;
    try { setError(''); setSummary(await dataService.getDashboard(user)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load dashboard.'); }
  }, [user]);
  useEffect(() => { void load(); }, [load]);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!summary) return <Loading />;
  const cards = [
    { label: t('bucketCount'), value: summary.bucketCount, icon: ShoppingBasket },
    { label: t('sharedBucketCount'), value: summary.sharedBucketCount, icon: Users },
    { label: t('itemCount'), value: summary.activeItemCount, icon: Utensils },
    { label: t('orderCount'), value: summary.orderCount, icon: ClipboardList },
    { label: t('placedCount'), value: summary.placedOrderCount, icon: CheckCircle2 },
  ];
  return <div className="page stack-lg">
    <section className="hero-card"><div><p className="eyebrow">{t('welcome')}</p><h1>{profile?.fullName ?? user?.displayName}</h1><p>{t('quickStart')}</p></div><Link className="button" to="/buckets/new"><Plus />{t('createBucket')}</Link></section>
    <section className="stat-grid">{cards.map(({ label, value, icon: Icon }) => <article className="stat-card" key={label}><Icon /><div><strong>{value}</strong><span>{label}</span></div></article>)}</section>
    <section className="section-card"><div className="section-heading"><div><p className="eyebrow">{t('recentOrders')}</p><h2>{t('myOrders')}</h2></div><Link to="/orders">{t('orders')}</Link></div>
      {summary.recentOrders.length ? <div className="list">{summary.recentOrders.map((order) => <Link to={`/orders/${order.id}`} className="list-row" key={order.id}><div><strong>{order.bucketTitle}</strong><span>{formatDateTime(order.createdAt, locale)}</span></div><div className="row-end"><StatusBadge status={order.status} /><strong>{formatMoney(order.total, order.currency, locale)}</strong></div></Link>)}</div> : <p className="muted">{t('emptyOrders')}</p>}
    </section>
  </div>;
}
