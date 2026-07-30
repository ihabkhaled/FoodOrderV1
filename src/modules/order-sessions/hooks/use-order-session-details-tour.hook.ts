import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface OrderSessionDetailsTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for a single order round. Every step centres its card:
 * this page explains how the screen behaves rather than pointing at one
 * control, and a centred card stays readable on a narrow phone.
 */
export function useOrderSessionDetailsTour(): OrderSessionDetailsTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'status',
        title: t('tourSessionDetailsStatusTitle'),
        body: t('tourSessionDetailsStatusBody'),
        target: null,
      },
      {
        key: 'menu',
        title: t('tourSessionDetailsMenuTitle'),
        body: t('tourSessionDetailsMenuBody'),
        target: null,
      },
      {
        key: 'participants',
        title: t('tourSessionDetailsParticipantsTitle'),
        body: t('tourSessionDetailsParticipantsBody'),
        target: null,
      },
      {
        key: 'totals',
        title: t('tourSessionDetailsTotalsTitle'),
        body: t('tourSessionDetailsTotalsBody'),
        target: null,
      },
      {
        key: 'lock',
        title: t('tourSessionDetailsLockTitle'),
        body: t('tourSessionDetailsLockBody'),
        target: null,
      },
      {
        key: 'refresh',
        title: t('tourSessionDetailsRefreshTitle'),
        body: t('tourSessionDetailsRefreshBody'),
        target: null,
      },
      {
        key: 'settle',
        title: t('tourSessionDetailsSettleTitle'),
        body: t('tourSessionDetailsSettleBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
