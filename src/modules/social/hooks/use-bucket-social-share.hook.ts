import { useCallback, useEffect, useState } from 'react';

import type { Bucket, Locale } from '@/modules/data-access';
import { dataService } from '@/modules/data-access';
import { useApp } from '@/modules/session';
import { useParams } from '@/packages/router';
import type { MessageKey } from '@/shared/i18n';

import type { SocialMessageKey } from '../i18n/social-messages.constants';
import { translateSocial } from '../i18n/translate-social.helper';

export interface BucketSocialShareViewModel {
  t: (key: MessageKey) => string;
  s: (key: SocialMessageKey) => string;
  locale: Locale;
  bucket: Bucket | null;
  loading: boolean;
  error: string;
  retry: () => void;
  handleSuccess: (message: string) => void;
  handleError: (error: unknown) => void;
}

export function useBucketSocialShare(): BucketSocialShareViewModel {
  const { bucketId } = useParams();
  const { user, locale, t, showToast } = useApp();
  const s = (key: SocialMessageKey) => translateSocial(locale, key);
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

  const retry = (): void => {
    setLoading(true);
    void load();
  };

  return {
    t,
    s,
    locale,
    bucket,
    loading,
    error,
    retry,
    handleSuccess,
    handleError,
  };
}
