import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface BucketEditorTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for the bucket editor. Every step centres its card:
 * this page explains how the screen behaves rather than pointing at one
 * control, and a centred card stays readable on a narrow phone.
 */
export function useBucketEditorTour(): BucketEditorTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'name',
        title: t('tourBucketEditorNameTitle'),
        body: t('tourBucketEditorNameBody'),
        target: null,
      },
      {
        key: 'items',
        title: t('tourBucketEditorItemsTitle'),
        body: t('tourBucketEditorItemsBody'),
        target: null,
      },
      {
        key: 'category',
        title: t('tourBucketEditorCategoryTitle'),
        body: t('tourBucketEditorCategoryBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
