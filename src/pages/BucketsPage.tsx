import { CopyPlus, KeyRound, Plus, Search, Share2, ShoppingBasket, Trash2, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Loading } from '@/components/Loading';
import { formatDateTime } from '@/lib/date';
import { dataService, sharingService } from '@/services';
import { useApp } from '@/state/AppContext';
import type { Bucket } from '@/types/domain';

export function BucketsPage() {
  const { user, locale, t, showToast } = useApp();
  const [buckets, setBuckets] = useState<Bucket[] | null>(null);
  const [shared, setShared] = useState<Bucket[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<Bucket | null>(null);
  const load = useCallback(async () => {
    if (!user) return;
    try {
      setError('');
      const [owned, sharedWithMe] = await Promise.all([
        dataService.listBuckets(user),
        sharingService.listSharedWithMe(user),
      ]);
      setBuckets(owned);
      setShared(sharedWithMe);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('tryAgain'));
    }
  }, [user, t]);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(
    () => (buckets ?? []).filter((bucket) => `${bucket.title} ${bucket.description}`.toLowerCase().includes(query.toLowerCase())),
    [buckets, query],
  );
  const filteredShared = useMemo(
    () => shared.filter((bucket) => `${bucket.title} ${bucket.description}`.toLowerCase().includes(query.toLowerCase())),
    [shared, query],
  );
  const remove = async () => {
    if (!user || !deleting) return;
    try {
      await dataService.deleteBucket(user, deleting.id);
      setBuckets((current) => current?.filter((bucket) => bucket.id !== deleting.id) ?? []);
      showToast(t('bucketDeleted'), 'success');
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    } finally {
      setDeleting(null);
    }
  };
  const duplicate = async (bucket: Bucket) => {
    if (!user) return;
    try {
      const copy = await dataService.createBucket(user, {
        title: `${bucket.title} (${t('copySuffix')})`.slice(0, 60),
        description: bucket.description,
        currency: bucket.currency,
        // Fresh item ids: a duplicate is a new template, not a shared history.
        items: bucket.items.map(({ name, description, category, unitPrice, active, sortOrder }) => ({
          id: '', name, description, category, unitPrice, active, sortOrder,
        })),
      });
      setBuckets((current) => [copy, ...(current ?? [])]);
      showToast(t('bucketSaved'), 'success');
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    }
  };
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!buckets) return <Loading />;
  return <div className="page stack-lg">
    <div className="page-heading">
      <div><p className="eyebrow">{t('myBuckets')}</p><h1>{t('buckets')}</h1></div>
      <div className="row-actions">
        <Link className="button secondary" to="/join"><KeyRound />{t('joinWithCode')}</Link>
        <Link className="button" to="/buckets/new"><Plus />{t('createBucket')}</Link>
      </div>
    </div>
    {buckets.length > 0 || shared.length > 0 ? (
      <>
        <label className="search-field"><Search /><input value={query} onChange={(event) => { setQuery(event.target.value); }} placeholder={t('searchBuckets')} aria-label={t('searchBuckets')} /></label>
        {filtered.length > 0 ? (
          <section className="card-grid">
            {filtered.map((bucket) => (
              <article className="bucket-card" key={bucket.id}>
                <div className="bucket-card-top">
                  <div className="bucket-icon"><ShoppingBasket /></div>
                  <div className="row-actions">
                    {bucket.visibility === 'shared' ? <span className="mode-pill"><Users size={13} aria-hidden="true" /> {t('shared')}</span> : null}
                    <button className="icon-button" aria-label={`${t('duplicate')} — ${bucket.title}`} onClick={() => void duplicate(bucket)}><CopyPlus /></button>
                    <button className="icon-button danger-ghost" aria-label={`${t('delete')} — ${bucket.title}`} onClick={() => { setDeleting(bucket); }}><Trash2 /></button>
                  </div>
                </div>
                <div><h2>{bucket.title}</h2><p>{bucket.description || `${bucket.items.length} ${t('items')}`}</p></div>
                <div className="bucket-meta">
                  <span>{bucket.items.filter((item) => item.active).length} {t('availableCount')}</span>
                  <span>{formatDateTime(bucket.updatedAt, locale)}</span>
                </div>
                <div className="card-actions">
                  <Link className="button secondary" to={`/buckets/${bucket.id}/edit`}>{t('edit')}</Link>
                  {bucket.visibility === 'shared'
                    ? <Link className="button" to={`/buckets/${bucket.id}/collaborate`}><Users />{t('collaborate')}</Link>
                    : <Link className="button" to={`/buckets/${bucket.id}/order`}>{t('orderNow')}</Link>}
                  <Link className="icon-button" aria-label={`${t('sharing')} — ${bucket.title}`} to={`/buckets/${bucket.id}/share`}><Share2 /></Link>
                </div>
              </article>
            ))}
          </section>
        ) : null}
        <section className="stack">
          <div className="section-heading"><div><p className="eyebrow">{t('sharedWithMe')}</p><h2>{t('sharedWithMe')}</h2></div></div>
          {filteredShared.length > 0 ? (
            <section className="card-grid">
              {filteredShared.map((bucket) => (
                <article className="bucket-card" key={bucket.id}>
                  <div className="bucket-card-top">
                    <div className="bucket-icon shared"><Users /></div>
                    <span className="mode-pill">{bucket.ownerName}</span>
                  </div>
                  <div><h2>{bucket.title}</h2><p>{bucket.description || `${bucket.items.length} ${t('items')}`}</p></div>
                  <div className="bucket-meta">
                    <span>{bucket.items.filter((item) => item.active).length} {t('availableCount')}</span>
                    <span>{formatDateTime(bucket.updatedAt, locale)}</span>
                  </div>
                  <div className="card-actions">
                    <Link className="button" to={`/buckets/${bucket.id}/collaborate`}><Users />{t('collaborate')}</Link>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <p className="muted">{t('emptyShared')} {t('emptySharedHint')}</p>
          )}
        </section>
      </>
    ) : (
      <EmptyState icon={<ShoppingBasket />} title={t('emptyBuckets')} description={t('quickStart')} action={<Link className="button" to="/buckets/new"><Plus />{t('createBucket')}</Link>} />
    )}
    <ConfirmDialog
      open={Boolean(deleting)}
      title={t('delete')}
      message={deleting?.visibility === 'shared' ? t('confirmDeleteSharedBucket') : t('confirmDeleteBucket')}
      confirmLabel={t('delete')}
      cancelLabel={t('cancel')}
      danger
      onConfirm={() => void remove()}
      onCancel={() => { setDeleting(null); }}
    />
  </div>;
}
