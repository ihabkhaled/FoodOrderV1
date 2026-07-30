import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface CreateOrderTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for placing an order. Every step centres its card:
 * this page explains how the screen behaves rather than pointing at one
 * control, and a centred card stays readable on a narrow phone.
 */
export function useCreateOrderTour(): CreateOrderTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'items',
        title: t('tourCreateOrderItemsTitle'),
        body: t('tourCreateOrderItemsBody'),
        target: null,
      },
      {
        key: 'quantities',
        title: t('tourCreateOrderQuantitiesTitle'),
        body: t('tourCreateOrderQuantitiesBody'),
        target: null,
      },
      {
        key: 'subtotal',
        title: t('tourCreateOrderSubtotalTitle'),
        body: t('tourCreateOrderSubtotalBody'),
        target: null,
      },
      {
        key: 'fees',
        title: t('tourCreateOrderFeesTitle'),
        body: t('tourCreateOrderFeesBody'),
        target: null,
      },
      {
        key: 'totals',
        title: t('tourCreateOrderTotalsTitle'),
        body: t('tourCreateOrderTotalsBody'),
        target: null,
      },
      {
        key: 'notes',
        title: t('tourCreateOrderNotesTitle'),
        body: t('tourCreateOrderNotesBody'),
        target: null,
      },
      {
        key: 'place',
        title: t('tourCreateOrderPlaceTitle'),
        body: t('tourCreateOrderPlaceBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
