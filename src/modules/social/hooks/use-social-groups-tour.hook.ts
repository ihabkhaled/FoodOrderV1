import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface SocialGroupsTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for the friend groups page. Every step centres its card: this page
 * explains how the screen behaves rather than pointing at one control, and a
 * centred card stays readable on a narrow phone.
 */
export function useSocialGroupsTour(): SocialGroupsTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'why',
        title: t('tourSocialGroupsWhyTitle'),
        body: t('tourSocialGroupsWhyBody'),
        target: null,
      },
      {
        key: 'create',
        title: t('tourSocialGroupsCreateTitle'),
        body: t('tourSocialGroupsCreateBody'),
        target: null,
      },
      {
        key: 'invite',
        title: t('tourSocialGroupsInviteTitle'),
        body: t('tourSocialGroupsInviteBody'),
        target: null,
      },
      {
        key: 'members',
        title: t('tourSocialGroupsMembersTitle'),
        body: t('tourSocialGroupsMembersBody'),
        target: null,
      },
      {
        key: 'leave',
        title: t('tourSocialGroupsLeaveTitle'),
        body: t('tourSocialGroupsLeaveBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
