import { ClipboardList, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Loading } from '@/components/Loading';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDateTime } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { dataService } from '@/services';
import { useApp } from '@/state/AppContext';
import type { Order, OrderStatus } from '@/types/domain';

const statuses: (OrderStatus | 'all')[] = ['all', 'draft', 'placed', 'completed', 'cancelled'];
export function OrdersPage() {
  const { user, locale, t, showToast } = useApp(); const [orders, setOrders] = useState<Order[] | null>(null);
  const [query, setQuery] = useState(''); const [status, setStatus] = useState<OrderStatus | 'all'>('all'); const [error, setError] = useState(''); const [deleting, setDeleting] = useState<Order | null>(null);
  const load = useCallback(async () => { if (!user) return; try { setError(''); setOrders(await dataService.listOrders(user.id)); } catch (error_) { setError(error_ instanceof Error ? error_.message : 'Unable to load orders.'); } }, [user]);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => (orders ?? []).filter((order) => (status === 'all' || order.status === status) && `${order.bucketTitle} ${order.notes} ${order.lines.map((line) => line.name).join(' ')}`.toLowerCase().includes(query.toLowerCase())), [orders, query, status]);
  const remove = async () => { if (!user || !deleting) return; try { await dataService.deleteOrder(user.id, deleting.id); setOrders((current) => current?.filter((order) => order.id !== deleting.id) ?? []); showToast(t('orderDeleted'), 'success'); } catch (error_) { showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error'); } finally { setDeleting(null); } };
  if (error) return <ErrorState message={error} onRetry={() => void load()} />; if (!orders) return <Loading />;
  return <div className="page stack-lg"><div className="page-heading"><div><p className="eyebrow">{t('myOrders')}</p><h1>{t('orders')}</h1></div></div>{orders.length > 0 ? <><div className="filters"><label className="search-field"><Search /><input value={query} onChange={(event) => { setQuery(event.target.value); }} placeholder={t('searchOrders')} aria-label={t('searchOrders')} /></label><select value={status} onChange={(event) => { setStatus(event.target.value as OrderStatus | 'all'); }} aria-label={t('status')}><option value="all">{t('allStatuses')}</option>{statuses.slice(1).map((value) => <option key={value} value={value}>{t(value as OrderStatus)}</option>)}</select></div><section className="section-card list">{filtered.map((order) => <article className="list-row order-row" key={order.id}><Link to={`/orders/${order.id}`} className="grow"><div><strong>{order.bucketTitle}</strong><span>{order.lines.length} {t('items')} · {formatDateTime(order.createdAt, locale)}</span></div></Link><StatusBadge status={order.status} /><strong>{formatMoney(order.total, order.currency, locale)}</strong><button className="icon-button danger-ghost" onClick={() => { setDeleting(order); }} aria-label={t('delete')}><Trash2 /></button></article>)}</section></> : <EmptyState icon={<ClipboardList />} title={t('emptyOrders')} description={t('ordersEmptyHint')} action={<Link className="button" to="/buckets">{t('buckets')}</Link>} />}<ConfirmDialog open={Boolean(deleting)} title={t('delete')} message={t('confirmDeleteOrder')} confirmLabel={t('delete')} cancelLabel={t('cancel')} danger onConfirm={() => void remove()} onCancel={() => { setDeleting(null); }} /></div>;
}
