import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface BucketShareMembersTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for the bucket members page. Every step centres its card: this page
 * explains how the screen behaves rather than pointing at one control, and a
 * centred card stays readable on a narrow phone.
 */
export function useBucketShareMembersTour(): BucketShareMembersTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'roles',
        title: t('tourShareMembersRolesTitle'),
        body: t('tourShareMembersRolesBody'),
        target: null,
      },
      {
        key: 'permissions',
        title: t('tourShareMembersPermissionsTitle'),
        body: t('tourShareMembersPermissionsBody'),
        target: null,
      },
      {
        key: 'change',
        title: t('tourShareMembersChangeTitle'),
        body: t('tourShareMembersChangeBody'),
        target: null,
      },
      {
        key: 'remove',
        title: t('tourShareMembersRemoveTitle'),
        body: t('tourShareMembersRemoveBody'),
        target: null,
      },
      {
        key: 'history',
        title: t('tourShareMembersHistoryTitle'),
        body: t('tourShareMembersHistoryBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
