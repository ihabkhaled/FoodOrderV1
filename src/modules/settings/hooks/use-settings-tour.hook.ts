import { useMemo, useState } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface SettingsTourViewModel {
  /** Callback ref: attach with `ref={...}` on the element to spotlight. */
  setSectionsElement: (element: HTMLElement | null) => void;
  steps: FeatureTourStep[];
}

/** Spotlight targets and copy for the settings hub tour. */
export function useSettingsTour(): SettingsTourViewModel {
  const { t } = useApp();
  const [sectionsElement, setSectionsElement] = useState<HTMLElement | null>(
    null,
  );

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'sections',
        title: t('tourSettingsTitle'),
        body: t('tourSettingsBody'),
        target: sectionsElement,
      },
      {
        key: 'preferences',
        title: t('tourSettingsPreferencesCardTitle'),
        body: t('tourSettingsPreferencesCardBody'),
        target: null,
      },
      {
        key: 'privacy',
        title: t('tourSettingsPrivacyCardTitle'),
        body: t('tourSettingsPrivacyCardBody'),
        target: null,
      },
      {
        key: 'security',
        title: t('tourSettingsSecurityCardTitle'),
        body: t('tourSettingsSecurityCardBody'),
        target: null,
      },
      {
        key: 'account',
        title: t('tourSettingsAccountCardTitle'),
        body: t('tourSettingsAccountCardBody'),
        target: null,
      },
    ],
    [t, sectionsElement],
  );

  return { setSectionsElement, steps };
}
