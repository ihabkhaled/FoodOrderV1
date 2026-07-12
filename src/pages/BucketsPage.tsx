import { Plus, Search, ShoppingBasket, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Loading } from '@/components/Loading';
import { formatDateTime } from '@/lib/date';
import { dataService } from '@/services';
import { useApp } from '@/state/AppContext';
import type { Bucket } from '@/types/domain';

export function BucketsPage() {
  const { user, locale, t, showToast } = useApp();
  const [buckets, setBuckets] = useState<Bucket[] | null>(null); const [query, setQuery] = useState('');
  const [error, setError] = useState(''); const [deleting, setDeleting] = useState<Bucket | null>(null);
  const load = useCallback(async () => { if (!user) return; try { setError(''); setBuckets(await dataService.listBuckets(user.id)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load buckets.'); } }, [user]);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => (buckets ?? []).filter((bucket) => `${bucket.title} ${bucket.description}`.toLowerCase().includes(query.toLowerCase())), [buckets, query]);
  const remove = async () => { if (!user || !deleting) return; try { await dataService.deleteBucket(user.id, deleting.id); setBuckets((current) => current?.filter((bucket) => bucket.id !== deleting.id) ?? []); showToast('Bucket deleted.', 'success'); } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to delete bucket.', 'error'); } finally { setDeleting(null); } };
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!buckets) return <Loading />;
  return <div className="page stack-lg"><div className="page-heading"><div><p className="eyebrow">{t('myBuckets')}</p><h1>{t('buckets')}</h1></div><Link className="button" to="/buckets/new"><Plus />{t('createBucket')}</Link></div>
    {buckets.length ? <><label className="search-field"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search buckets" /></label><section className="card-grid">{filtered.map((bucket) => <article className="bucket-card" key={bucket.id}><div className="bucket-card-top"><div className="bucket-icon"><ShoppingBasket /></div><button className="icon-button danger-ghost" aria-label={t('delete')} onClick={() => setDeleting(bucket)}><Trash2 /></button></div><div><h2>{bucket.title}</h2><p>{bucket.description || `${bucket.items.length} items`}</p></div><div className="bucket-meta"><span>{bucket.items.filter((item) => item.active).length} available</span><span>{formatDateTime(bucket.updatedAt, locale)}</span></div><div className="card-actions"><Link className="button secondary" to={`/buckets/${bucket.id}/edit`}>{t('edit')}</Link><Link className="button" to={`/buckets/${bucket.id}/order`}>{t('orderNow')}</Link></div></article>)}</section></> : <EmptyState icon={<ShoppingBasket />} title={t('emptyBuckets')} description={t('quickStart')} action={<Link className="button" to="/buckets/new"><Plus />{t('createBucket')}</Link>} />}
    <ConfirmDialog open={Boolean(deleting)} title={t('delete')} message={t('confirmDeleteBucket')} confirmLabel={t('delete')} cancelLabel={t('cancel')} danger onConfirm={() => void remove()} onCancel={() => setDeleting(null)} />
  </div>;
}
