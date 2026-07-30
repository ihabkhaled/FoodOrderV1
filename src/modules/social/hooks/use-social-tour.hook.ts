import { useMemo, useState } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface SocialTourViewModel {
  /** Callback ref: attach with `ref={...}` on the element to spotlight. */
  setPeopleElement: (element: HTMLElement | null) => void;
  steps: FeatureTourStep[];
}

/** Spotlight targets and copy for the social tour. */
export function useSocialTour(): SocialTourViewModel {
  const { t } = useApp();
  const [peopleElement, setPeopleElement] =
    useState<HTMLElement | null>(null);

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'people',
        title: t('tourSocialTitle'),
        body: t('tourSocialBody'),
        target: peopleElement,
      },
    ],
    [t, peopleElement],
  );

  return { setPeopleElement, steps };
}
