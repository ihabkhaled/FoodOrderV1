import { ArrowLeft, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loading } from '@/components/Loading';
import { MAX_ORDER_QUANTITY } from '@/lib/bucket';
import { formatMoney } from '@/lib/money';
import { calculateOrderTotal } from '@/lib/order';
import { dataService } from '@/services';
import { useApp } from '@/state/AppContext';
import type { Bucket } from '@/types/domain';

export function CreateOrderPage() {
  const { bucketId } = useParams(); const navigate = useNavigate(); const { user, locale, t, showToast } = useApp();
  const [bucket, setBucket] = useState<Bucket | null>(null); const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState(''); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (!user || !bucketId) return; void dataService.getBucket(user, bucketId).then((value) => { if (!value) throw new Error('Bucket was not found.'); setBucket(value); }).catch((reason: unknown) => { setError(reason instanceof Error ? reason.message : 'Unable to load bucket.'); }).finally(() => { setLoading(false); }); }, [bucketId, user]);
  const selectedLines = useMemo(() => bucket?.items.filter((item) => item.active && (quantities[item.id] ?? 0) > 0).map((item) => ({ id: item.id, bucketItemId: item.id, name: item.name, quantity: quantities[item.id] ?? 0, unitPrice: item.unitPrice })) ?? [], [bucket, quantities]);
  const total = calculateOrderTotal(selectedLines);
  const adjust = (id: string, delta: number): void => { setQuantities((current) => ({ ...current, [id]: Math.max(0, Math.min(MAX_ORDER_QUANTITY, (current[id] ?? 0) + delta)) })); };
  const submit = async (status: 'draft' | 'placed') => { if (!user || !bucket) return; if (!selectedLines.length) { setError(t('noItemsSelected')); return; } try { setBusy(true); setError(''); const order = await dataService.createOrder(user.id, { bucketId: bucket.id, bucketTitle: bucket.title, currency: bucket.currency, lines: selectedLines, notes, status }); showToast(status === 'placed' ? t('orderPlaced') : t('draftSaved'), 'success'); await navigate(`/orders/${order.id}`); } catch (reason) { setError(reason instanceof Error ? reason.message : t('tryAgain')); } finally { setBusy(false); } };
  if (loading) return <Loading />; if (!bucket) return <div className="page"><p className="form-error">{error || 'Bucket was not found.'}</p></div>;
  return <div className="page narrow"><Link className="back-link" to="/buckets"><ArrowLeft />{t('back')}</Link><div className="page-heading"><div><p className="eyebrow">{t('orderNow')}</p><h1>{bucket.title}</h1><p>{bucket.description}</p></div><div className="total-block"><span>{t('total')}</span><strong>{formatMoney(total, bucket.currency, locale)}</strong></div></div>
    <form className="stack-lg"><section className="section-card order-picker">{bucket.items.filter((item) => item.active).map((item) => <article className="order-line" key={item.id}><div><h3>{item.name}</h3><span>{item.category || t('item')} · {formatMoney(item.unitPrice, bucket.currency, locale)}</span></div><div className="quantity-control"><button type="button" className="icon-button" onClick={() => { adjust(item.id, -1); }} aria-label={`${t('decrease')} ${item.name}`}><Minus /></button><output>{quantities[item.id] ?? 0}</output><button type="button" className="icon-button" onClick={() => { adjust(item.id, 1); }} aria-label={`${t('increase')} ${item.name}`}><Plus /></button></div></article>)}</section><section className="section-card"><label>{t('notes')}<textarea rows={4} maxLength={500} value={notes} onChange={(event) => { setNotes(event.target.value); }} placeholder={t('orderNotesPlaceholder')} /></label></section>{error ? <p className="form-error">{error}</p> : null}<div className="sticky-actions"><button type="button" className="button secondary" disabled={busy || !selectedLines.length} onClick={() => void submit('draft')}>{t('saveDraft')}</button><button type="button" className="button" disabled={busy || !selectedLines.length} onClick={() => void submit('placed')}><ShoppingCart />{busy ? t('loading') : t('placeOrder')}</button></div></form>
  </div>;
}
