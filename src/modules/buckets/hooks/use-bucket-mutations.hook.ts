import { useCallback, useState } from 'react';

import type { Bucket, SessionUser } from '@/modules/data-access';
import { buildDuplicateBucketDraft, dataService } from '@/modules/data-access';
import { ANALYTICS_EVENT, telemetryRecorder } from '@/modules/telemetry';
import type { MessageKey } from '@/shared/i18n';
import { useUndoableDelete } from '@/shared/ui';

interface BucketMutationOptions {
  readonly user: SessionUser | null;
  readonly t: (key: MessageKey) => string;
  readonly showToast: (
    message: string,
    kind?: 'success' | 'error' | 'info',
    action?: { label: string; onClick: () => void },
  ) => void;
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
  const undoableDelete = useUndoableDelete();

  // Confirming delete does not delete anything yet: it schedules the write
  // and hides the menu from the list immediately, so "Delete this menu?"
  // (the confirm dialog) and "Menu deleted. Undo" (the toast) together give
  // a person two real chances to stop it before it is actually gone.
  const remove = useCallback((): void => {
    if (!user || !deleting) return;
    const bucket = deleting;
    setDeleting(null);
    undoableDelete.schedule(bucket.id, async () => {
      try {
        await dataService.deleteBucket(user, bucket.id);
      } catch (error) {
        showToast(errorMessage(error), 'error');
      } finally {
        await refresh();
      }
    });
    showToast(t('bucketDeleted'), 'success', {
      label: t('undo'),
      onClick: () => {
        if (undoableDelete.cancel(bucket.id)) {
          showToast(t('undone'), 'info');
        }
      },
    });
  }, [deleting, errorMessage, refresh, showToast, t, undoableDelete, user]);

  const duplicate = useCallback(
    async (bucket: Bucket): Promise<void> => {
      if (!user) return;
      try {
        const created = await dataService.createBucket(
          user,
          buildDuplicateBucketDraft(bucket),
        );
        telemetryRecorder.record(ANALYTICS_EVENT.firstMenuCreated, {
          itemCount: created.items.length,
          participantCount: 0,
          isFirstValueMoment: false,
        });
        await refresh();
        showToast(t('bucketSaved'), 'success');
      } catch (error) {
        showToast(errorMessage(error), 'error');
      }
    },
    [errorMessage, refresh, showToast, t, user],
  );

  return {
    deleting,
    setDeleting,
    remove,
    duplicate,
    pendingDeleteIds: undoableDelete.pendingIds,
  };
};
