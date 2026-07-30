import { useMemo, useState } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface SocialTourViewModel {
  /** Callback ref: attach with `ref={...}` on the element to spotlight. */
  setPeopleElement: (element: HTMLElement | null) => void;
  steps: FeatureTourStep[];
}

/** Spotlight targets and copy for the friends and groups tour. */
export function useSocialTour(): SocialTourViewModel {
  const { t } = useApp();
  const [peopleElement, setPeopleElement] = useState<HTMLElement | null>(null);

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'people',
        title: t('tourSocialTitle'),
        body: t('tourSocialBody'),
        target: peopleElement,
      },
      {
        key: 'invite',
        title: t('tourSocialInviteTitle'),
        body: t('tourSocialInviteBody'),
        target: null,
      },
      {
        key: 'requests',
        title: t('tourSocialRequestsTitle'),
        body: t('tourSocialRequestsBody'),
        target: null,
      },
      {
        key: 'groups',
        title: t('tourSocialGroupsTitle'),
        body: t('tourSocialGroupsBody'),
        target: null,
      },
      {
        key: 'share',
        title: t('tourSocialShareBucketsTitle'),
        body: t('tourSocialShareBucketsBody'),
        target: null,
      },
      {
        key: 'remove',
        title: t('tourSocialRemoveTitle'),
        body: t('tourSocialRemoveBody'),
        target: null,
      },
    ],
    [t, peopleElement],
  );

  return { setPeopleElement, steps };
}
