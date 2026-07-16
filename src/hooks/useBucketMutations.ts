import { useCallback, useState } from 'react';

import type { Bucket, SessionUser } from '@/modules/data-access';
import { buildDuplicateBucketDraft, dataService } from '@/modules/data-access';
import type { MessageKey } from '@/shared/i18n';

interface BucketMutationOptions {
  readonly user: SessionUser | null;
  readonly t: (key: MessageKey) => string;
  readonly showToast: (message: string, kind?: 'success' | 'error' | 'info') => void;
  readonly errorMessage: (error: unknown) => string;
  readonly refresh: () => Promise<void>;
}

export const useBucketMutations = ({
  user,
  t,
  showToast,
  errorMessage,
  refresh,
}: BucketMutationOptions) => {
  const [deleting, setDeleting] = useState<Bucket | null>(null);

  const remove = useCallback(async (): Promise<void> => {
    if (!user || !deleting) return;
    try {
      await dataService.deleteBucket(user, deleting.id);
      await refresh();
      showToast(t('bucketDeleted'), 'success');
    } catch (error) {
      showToast(errorMessage(error), 'error');
    } finally {
      setDeleting(null);
    }
  }, [deleting, errorMessage, refresh, showToast, t, user]);

  const duplicate = useCallback(
    async (bucket: Bucket): Promise<void> => {
      if (!user) return;
      try {
        await dataService.createBucket(
          user,
          buildDuplicateBucketDraft(bucket, t('copySuffix')),
        );
        await refresh();
        showToast(t('bucketSaved'), 'success');
      } catch (error) {
        showToast(errorMessage(error), 'error');
      }
    },
    [errorMessage, refresh, showToast, t, user],
  );

  return { deleting, setDeleting, remove, duplicate };
};
