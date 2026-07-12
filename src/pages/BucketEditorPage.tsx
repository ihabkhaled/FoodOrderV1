import { ArrowLeft, GripVertical, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loading } from '@/components/Loading';
import { MAX_BUCKET_ITEMS } from '@/lib/bucket';
import { createId } from '@/lib/id';
import { dataService } from '@/services';
import { useApp } from '@/state/AppContext';
import type { BucketDraft, BucketItem, CurrencyCode } from '@/types/domain';

const emptyItem = (sortOrder: number): BucketItem => ({ id: createId('item'), name: '', description: '', category: '', unitPrice: 0, active: true, sortOrder });
const currencies: CurrencyCode[] = ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'];

export function BucketEditorPage() {
  const { bucketId } = useParams(); const isEditing = Boolean(bucketId); const navigate = useNavigate();
  const { user, profile, t, showToast } = useApp();
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(profile?.defaultCurrency ?? 'EGP');
  const [items, setItems] = useState<BucketItem[]>([emptyItem(0)]); const [loading, setLoading] = useState(isEditing);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (!user || !bucketId) return; void dataService.getBucket(user.id, bucketId).then((bucket) => { if (!bucket) throw new Error('Bucket was not found.'); setTitle(bucket.title); setDescription(bucket.description); setCurrency(bucket.currency); setItems(bucket.items); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load bucket.')).finally(() => setLoading(false)); }, [bucketId, user]);
  const valid = useMemo(() => title.trim().length > 0 && items.length > 0 && items.every((item) => item.name.trim() && item.unitPrice >= 0), [title, items]);
  const updateItem = <K extends keyof BucketItem>(id: string, key: K, value: BucketItem[K]): void => setItems((current) => current.map((item) => item.id === id ? { ...item, [key]: value } : item));
  const addItem = (): void => { if (items.length >= MAX_BUCKET_ITEMS) return showToast(`Maximum ${MAX_BUCKET_ITEMS} items.`, 'error'); setItems((current) => [...current, emptyItem(current.length)]); };
  const removeItem = (id: string): void => setItems((current) => current.length === 1 ? current : current.filter((item) => item.id !== id).map((item, index) => ({ ...item, sortOrder: index })));
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!user || !valid) return setError('Add a title and complete every item.'); const draft: BucketDraft = { title, description, currency, items }; try { setBusy(true); setError(''); if (bucketId) await dataService.updateBucket(user.id, bucketId, draft); else await dataService.createBucket(user.id, draft); showToast('Bucket saved.', 'success'); navigate('/buckets'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save bucket.'); } finally { setBusy(false); } };
  if (loading) return <Loading />;
  return <div className="page narrow"><div className="page-heading"><div><Link className="back-link" to="/buckets"><ArrowLeft />{t('back')}</Link><h1>{isEditing ? t('editBucket') : t('createBucket')}</h1></div></div>
    <form className="stack-lg" onSubmit={(event) => void submit(event)}><section className="section-card form-grid"><label>{t('bucketTitle')}<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={60} required /></label><label>{t('description')}<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={240} rows={3} /></label><label>{t('currency')}<select value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)}>{currencies.map((code) => <option key={code}>{code}</option>)}</select></label></section>
      <section className="section-card"><div className="section-heading"><div><p className="eyebrow">Items</p><h2>{items.length} / {MAX_BUCKET_ITEMS}</h2></div><button type="button" className="button secondary" onClick={addItem}><Plus />{t('addItem')}</button></div><div className="item-editor-list">{items.map((item, index) => <article className="item-editor" key={item.id}><GripVertical className="drag-hint" aria-hidden="true" /><div className="item-fields"><label>{t('itemName')}<input value={item.name} onChange={(event) => updateItem(item.id, 'name', event.target.value)} maxLength={60} required /></label><label>{t('category')}<input value={item.category} onChange={(event) => updateItem(item.id, 'category', event.target.value)} maxLength={40} /></label><label>{t('unitPrice')}<input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(item.id, 'unitPrice', Number(event.target.value))} /></label><label className="checkbox-label"><input type="checkbox" checked={item.active} onChange={(event) => updateItem(item.id, 'active', event.target.checked)} />{t('active')}</label></div><button type="button" className="icon-button danger-ghost" disabled={items.length === 1} onClick={() => removeItem(item.id)} aria-label={`${t('delete')} ${index + 1}`}><Trash2 /></button></article>)}</div></section>
      {error ? <p className="form-error" role="alert">{error}</p> : null}<div className="sticky-actions"><Link className="button secondary" to="/buckets">{t('cancel')}</Link><button className="button" disabled={busy || !valid}><Save />{busy ? t('loading') : t('save')}</button></div>
    </form>
  </div>;
}
