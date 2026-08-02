import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface OrderSessionsTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for the order rounds list. Every step centres its card:
 * this page explains how the screen behaves rather than pointing at one
 * control, and a centred card stays readable on a narrow phone.
 */
export function useOrderSessionsTour(): OrderSessionsTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'rounds',
        title: t('tourSessionsTitle'),
        body: t('tourSessionsBody'),
        target: null,
      },
      {
        key: 'active',
        title: t('tourSessionsActiveTitle'),
        body: t('tourSessionsActiveBody'),
        target: null,
      },
      {
        key: 'refresh',
        title: t('tourSessionsRefreshTitle'),
        body: t('tourSessionsRefreshBody'),
        target: null,
      },
      {
        key: 'open',
        title: t('tourSessionsOpenTitle'),
        body: t('tourSessionsOpenBody'),
        target: null,
      },
      {
        key: 'empty',
        title: t('tourSessionsEmptyTitle'),
        body: t('tourSessionsEmptyBody'),
        target: null,
      },
      {
        key: 'organizer',
        title: t('tourSessionsOrganizerTitle'),
        body: t('tourSessionsOrganizerBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
