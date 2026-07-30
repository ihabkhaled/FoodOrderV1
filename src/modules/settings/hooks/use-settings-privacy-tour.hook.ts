import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface SettingsPrivacyTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for the privacy page. Every step centres its card:
 * this page explains how the screen behaves rather than pointing at one
 * control, and a centred card stays readable on a narrow phone.
 */
export function useSettingsPrivacyTour(): SettingsPrivacyTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'privacy',
        title: t('tourSettingsPrivacyTitle'),
        body: t('tourSettingsPrivacyBody'),
        target: null,
      },
      {
        key: 'consent',
        title: t('tourSettingsPrivacyConsentTitle'),
        body: t('tourSettingsPrivacyConsentBody'),
        target: null,
      },
      {
        key: 'stored',
        title: t('tourSettingsPrivacyStoredTitle'),
        body: t('tourSettingsPrivacyStoredBody'),
        target: null,
      },
      {
        key: 'clear',
        title: t('tourSettingsPrivacyClearTitle'),
        body: t('tourSettingsPrivacyClearBody'),
        target: null,
      },
      {
        key: 'thirdParty',
        title: t('tourSettingsPrivacyThirdPartyTitle'),
        body: t('tourSettingsPrivacyThirdPartyBody'),
        target: null,
      },
      {
        key: 'save',
        title: t('tourSettingsPrivacySaveTitle'),
        body: t('tourSettingsPrivacySaveBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
