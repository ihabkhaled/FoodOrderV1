import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface SocialFriendsTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for the friends page. Every step centres its card: this page
 * explains how the screen behaves rather than pointing at one control, and a
 * centred card stays readable on a narrow phone.
 */
export function useSocialFriendsTour(): SocialFriendsTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'search',
        title: t('tourSocialFriendsSearchTitle'),
        body: t('tourSocialFriendsSearchBody'),
        target: null,
      },
      {
        key: 'request',
        title: t('tourSocialFriendsRequestTitle'),
        body: t('tourSocialFriendsRequestBody'),
        target: null,
      },
      {
        key: 'list',
        title: t('tourSocialFriendsListTitle'),
        body: t('tourSocialFriendsListBody'),
        target: null,
      },
      {
        key: 'shortcut',
        title: t('tourSocialFriendsShortcutTitle'),
        body: t('tourSocialFriendsShortcutBody'),
        target: null,
      },
      {
        key: 'remove',
        title: t('tourSocialFriendsRemoveTitle'),
        body: t('tourSocialFriendsRemoveBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
