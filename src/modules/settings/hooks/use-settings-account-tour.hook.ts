import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface SettingsAccountTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for the data and account page. Every step centres its card:
 * this page explains how the screen behaves rather than pointing at one
 * control, and a centred card stays readable on a narrow phone.
 */
export function useSettingsAccountTour(): SettingsAccountTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'profile',
        title: t('tourSettingsAccountProfileTitle'),
        body: t('tourSettingsAccountProfileBody'),
        target: null,
      },
      {
        key: 'export',
        title: t('tourSettingsAccountExportTitle'),
        body: t('tourSettingsAccountExportBody'),
        target: null,
      },
      {
        key: 'danger',
        title: t('tourSettingsAccountDangerTitle'),
        body: t('tourSettingsAccountDangerBody'),
        target: null,
      },
      {
        key: 'reauth',
        title: t('tourSettingsAccountReauthTitle'),
        body: t('tourSettingsAccountReauthBody'),
        target: null,
      },
      {
        key: 'irreversible',
        title: t('tourSettingsAccountIrreversibleTitle'),
        body: t('tourSettingsAccountIrreversibleBody'),
        target: null,
      },
      {
        key: 'alternative',
        title: t('tourSettingsAccountAlternativeTitle'),
        body: t('tourSettingsAccountAlternativeBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
