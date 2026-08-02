import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface BucketSocialShareTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for sharing a menu with friends. Every step centres its card:
 * this page explains how the screen behaves rather than pointing at one
 * control, and a centred card stays readable on a narrow phone.
 */
export function useBucketSocialShareTour(): BucketSocialShareTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'share',
        title: t('tourSocialShareTitle'),
        body: t('tourSocialShareBody'),
        target: null,
      },
      {
        key: 'pick',
        title: t('tourSocialSharePickTitle'),
        body: t('tourSocialSharePickBody'),
        target: null,
      },
      {
        key: 'role',
        title: t('tourSocialShareRoleTitle'),
        body: t('tourSocialShareRoleBody'),
        target: null,
      },
      {
        key: 'open',
        title: t('tourSocialShareOpenTitle'),
        body: t('tourSocialShareOpenBody'),
        target: null,
      },
      {
        key: 'revoke',
        title: t('tourSocialShareRevokeTitle'),
        body: t('tourSocialShareRevokeBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
