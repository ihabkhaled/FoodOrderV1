import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface SocialRequestsTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for the pending requests page. Every step centres its card: this page
 * explains how the screen behaves rather than pointing at one control, and a
 * centred card stays readable on a narrow phone.
 */
export function useSocialRequestsTour(): SocialRequestsTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'intro',
        title: t('tourSocialRequestsIntroTitle'),
        body: t('tourSocialRequestsIntroBody'),
        target: null,
      },
      {
        key: 'friend',
        title: t('tourSocialRequestsFriendTitle'),
        body: t('tourSocialRequestsFriendBody'),
        target: null,
      },
      {
        key: 'group',
        title: t('tourSocialRequestsGroupTitle'),
        body: t('tourSocialRequestsGroupBody'),
        target: null,
      },
      {
        key: 'menu',
        title: t('tourSocialRequestsMenuTitle'),
        body: t('tourSocialRequestsMenuBody'),
        target: null,
      },
      {
        key: 'decline',
        title: t('tourSocialRequestsDeclineTitle'),
        body: t('tourSocialRequestsDeclineBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
