import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface BucketShareActivityTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for the bucket activity log. Every step centres its card: this page
 * explains how the screen behaves rather than pointing at one control, and a
 * centred card stays readable on a narrow phone.
 */
export function useBucketShareActivityTour(): BucketShareActivityTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'log',
        title: t('tourShareActivityLogTitle'),
        body: t('tourShareActivityLogBody'),
        target: null,
      },
      {
        key: 'order',
        title: t('tourShareActivityOrderTitle'),
        body: t('tourShareActivityOrderBody'),
        target: null,
      },
      {
        key: 'freeze',
        title: t('tourShareActivityFreezeTitle'),
        body: t('tourShareActivityFreezeBody'),
        target: null,
      },
      {
        key: 'trust',
        title: t('tourShareActivityTrustTitle'),
        body: t('tourShareActivityTrustBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
