import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface BucketShareTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for bucket sharing. Every step centres its card:
 * this page explains how the screen behaves rather than pointing at one
 * control, and a centred card stays readable on a narrow phone.
 */
export function useBucketShareTour(): BucketShareTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'enable',
        title: t('tourBucketShareEnableTitle'),
        body: t('tourBucketShareEnableBody'),
        target: null,
      },
      {
        key: 'code',
        title: t('tourBucketShareCodeTitle'),
        body: t('tourBucketShareCodeBody'),
        target: null,
      },
      {
        key: 'roles',
        title: t('tourBucketShareRolesTitle'),
        body: t('tourBucketShareRolesBody'),
        target: null,
      },
      {
        key: 'members',
        title: t('tourBucketShareMembersTitle'),
        body: t('tourBucketShareMembersBody'),
        target: null,
      },
      {
        key: 'freeze',
        title: t('tourBucketShareFreezeTitle'),
        body: t('tourBucketShareFreezeBody'),
        target: null,
      },
      {
        key: 'activity',
        title: t('tourBucketShareActivityTitle'),
        body: t('tourBucketShareActivityBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
