import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface BucketCollaborateTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for ordering from a shared menu. Every step centres its card:
 * this page explains how the screen behaves rather than pointing at one
 * control, and a centred card stays readable on a narrow phone.
 */
export function useBucketCollaborateTour(): BucketCollaborateTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'intro',
        title: t('tourCollaborateIntroTitle'),
        body: t('tourCollaborateIntroBody'),
        target: null,
      },
      {
        key: 'quantities',
        title: t('tourCollaborateQuantitiesTitle'),
        body: t('tourCollaborateQuantitiesBody'),
        target: null,
      },
      {
        key: 'totals',
        title: t('tourCollaborateTotalsTitle'),
        body: t('tourCollaborateTotalsBody'),
        target: null,
      },
      {
        key: 'place',
        title: t('tourCollaboratePlaceTitle'),
        body: t('tourCollaboratePlaceBody'),
        target: null,
      },
      {
        key: 'live',
        title: t('tourCollaborateLiveTitle'),
        body: t('tourCollaborateLiveBody'),
        target: null,
      },
      {
        key: 'etiquette',
        title: t('tourCollaborateEtiquetteTitle'),
        body: t('tourCollaborateEtiquetteBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
