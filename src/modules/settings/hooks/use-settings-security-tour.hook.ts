import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface SettingsSecurityTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for the security page. Every step centres its card:
 * this page explains how the screen behaves rather than pointing at one
 * control, and a centred card stays readable on a narrow phone.
 */
export function useSettingsSecurityTour(): SettingsSecurityTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'security',
        title: t('tourSettingsSecurityTitle'),
        body: t('tourSettingsSecurityBody'),
        target: null,
      },
      {
        key: 'current',
        title: t('tourSettingsSecurityCurrentTitle'),
        body: t('tourSettingsSecurityCurrentBody'),
        target: null,
      },
      {
        key: 'replacement',
        title: t('tourSettingsSecurityNewTitle'),
        body: t('tourSettingsSecurityNewBody'),
        target: null,
      },
      {
        key: 'confirm',
        title: t('tourSettingsSecurityConfirmTitle'),
        body: t('tourSettingsSecurityConfirmBody'),
        target: null,
      },
      {
        key: 'reveal',
        title: t('tourSettingsSecurityRevealTitle'),
        body: t('tourSettingsSecurityRevealBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
