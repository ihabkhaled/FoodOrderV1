import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface CreateOrderSessionTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for opening an order round. Every step centres its card:
 * this page explains how the screen behaves rather than pointing at one
 * control, and a centred card stays readable on a narrow phone.
 */
export function useCreateOrderSessionTour(): CreateOrderSessionTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'menu',
        title: t('tourCreateSessionMenuTitle'),
        body: t('tourCreateSessionMenuBody'),
        target: null,
      },
      {
        key: 'name',
        title: t('tourCreateSessionNameTitle'),
        body: t('tourCreateSessionNameBody'),
        target: null,
      },
      {
        key: 'deadline',
        title: t('tourCreateSessionDeadlineTitle'),
        body: t('tourCreateSessionDeadlineBody'),
        target: null,
      },
      {
        key: 'autoLock',
        title: t('tourCreateSessionAutoLockTitle'),
        body: t('tourCreateSessionAutoLockBody'),
        target: null,
      },
      {
        key: 'timezone',
        title: t('tourCreateSessionTimezoneTitle'),
        body: t('tourCreateSessionTimezoneBody'),
        target: null,
      },
      {
        key: 'open',
        title: t('tourCreateSessionOpenTitle'),
        body: t('tourCreateSessionOpenBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
