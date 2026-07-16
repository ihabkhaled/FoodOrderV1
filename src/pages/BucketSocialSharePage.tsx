import { useCallback, useEffect, useState } from 'react';

import { BucketSocialSharePanel } from '@/components/BucketSocialSharePanel';
import { ErrorState } from '@/components/ErrorState';
import { Loading } from '@/components/Loading';
import { translateSocial } from '@/i18n/socialMessages';
import type { Bucket } from '@/modules/data-access';
import { dataService } from '@/modules/data-access';
import { ArrowLeft } from '@/packages/icons';
import { Link, useParams } from '@/packages/router';
import { useApp } from '@/state/AppContext';

export function BucketSocialSharePage() {
  const { bucketId } = useParams();
  const { user, locale, t, showToast } = useApp();
  const s = (key: Parameters<typeof translateSocial>[1]) =>
    translateSocial(locale, key);
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user || !bucketId) return;
    try {
      setError('');
      const found = await dataService.getBucket(user, bucketId);
      if (!found || found.ownerId !== user.id) throw new Error(t('notAllowed'));
      setBucket(found);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('tryAgain'));
    } finally {
      setLoading(false);
    }
  }, [bucketId, t, user]);

  const handleSuccess = useCallback(
    (message: string) => {
      showToast(message, 'success');
    },
    [showToast],
  );
  const handleError = useCallback(
    (error_: unknown) => {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    },
    [showToast, t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading />;
  if (!bucket || error) {
    return (
      <ErrorState
        message={error || t('notAllowed')}
        onRetry={() => {
          setLoading(true);
          void load();
        }}
      />
    );
  }

  return (
    <div className="page narrow stack-lg">
      <Link className="back-link" to="/social">
        <ArrowLeft />
        {t('back')}
      </Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">{s('shareWithFriends')}</p>
          <h1>{bucket.title}</h1>
        </div>
      </header>
      <BucketSocialSharePanel
        bucketId={bucket.id}
        locale={locale}
        disabled={(bucket.orderState ?? 'open') !== 'open'}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}
