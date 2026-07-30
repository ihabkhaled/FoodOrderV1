import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface JoinBucketTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for joining a menu by code. Every step centres its card:
 * this page explains how the screen behaves rather than pointing at one
 * control, and a centred card stays readable on a narrow phone.
 */
export function useJoinBucketTour(): JoinBucketTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'join',
        title: t('tourJoinTitle'),
        body: t('tourJoinBody'),
        target: null,
      },
      {
        key: 'code',
        title: t('tourJoinCodeTitle'),
        body: t('tourJoinCodeBody'),
        target: null,
      },
      {
        key: 'preview',
        title: t('tourJoinPreviewTitle'),
        body: t('tourJoinPreviewBody'),
        target: null,
      },
      {
        key: 'role',
        title: t('tourJoinRoleTitle'),
        body: t('tourJoinRoleBody'),
        target: null,
      },
      {
        key: 'shared',
        title: t('tourJoinSharedTitle'),
        body: t('tourJoinSharedBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
