import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface OrderDetailsTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for order details. Every step centres its card:
 * this page explains how the screen behaves rather than pointing at one
 * control, and a centred card stays readable on a narrow phone.
 */
export function useOrderDetailsTour(): OrderDetailsTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'status',
        title: t('tourOrderDetailsStatusTitle'),
        body: t('tourOrderDetailsStatusBody'),
        target: null,
      },
      {
        key: 'items',
        title: t('tourOrderDetailsItemsTitle'),
        body: t('tourOrderDetailsItemsBody'),
        target: null,
      },
      {
        key: 'totals',
        title: t('tourOrderDetailsTotalsTitle'),
        body: t('tourOrderDetailsTotalsBody'),
        target: null,
      },
      {
        key: 'notes',
        title: t('tourOrderDetailsNotesTitle'),
        body: t('tourOrderDetailsNotesBody'),
        target: null,
      },
      {
        key: 'revision',
        title: t('tourOrderDetailsRevisionTitle'),
        body: t('tourOrderDetailsRevisionBody'),
        target: null,
      },
      {
        key: 'repeat',
        title: t('tourOrderDetailsRepeatTitle'),
        body: t('tourOrderDetailsRepeatBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
