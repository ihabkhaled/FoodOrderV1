import { useMemo } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface SettingsPreferencesTourViewModel {
  steps: FeatureTourStep[];
}

/**
 * Guided-tour copy for the preferences page. Every step centres its card:
 * this page explains how the screen behaves rather than pointing at one
 * control, and a centred card stays readable on a narrow phone.
 */
export function useSettingsPreferencesTour(): SettingsPreferencesTourViewModel {
  const { t } = useApp();

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'preferences',
        title: t('tourSettingsPreferencesTitle'),
        body: t('tourSettingsPreferencesBody'),
        target: null,
      },
      {
        key: 'profile',
        title: t('tourSettingsPreferencesProfileTitle'),
        body: t('tourSettingsPreferencesProfileBody'),
        target: null,
      },
      {
        key: 'language',
        title: t('tourSettingsPreferencesLanguageTitle'),
        body: t('tourSettingsPreferencesLanguageBody'),
        target: null,
      },
      {
        key: 'theme',
        title: t('tourSettingsPreferencesThemeTitle'),
        body: t('tourSettingsPreferencesThemeBody'),
        target: null,
      },
      {
        key: 'notifications',
        title: t('tourSettingsPreferencesNotificationsTitle'),
        body: t('tourSettingsPreferencesNotificationsBody'),
        target: null,
      },
      {
        key: 'replay',
        title: t('tourSettingsPreferencesReplayTitle'),
        body: t('tourSettingsPreferencesReplayBody'),
        target: null,
      },
    ],
    [t],
  );

  return { steps };
}
