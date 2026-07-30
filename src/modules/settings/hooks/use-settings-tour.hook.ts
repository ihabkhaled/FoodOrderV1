import { useMemo, useState } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface SettingsTourViewModel {
  /** Callback ref: attach with `ref={...}` on the element to spotlight. */
  setSectionsElement: (element: HTMLElement | null) => void;
  steps: FeatureTourStep[];
}

/** Spotlight targets and copy for the settings tour. */
export function useSettingsTour(): SettingsTourViewModel {
  const { t } = useApp();
  const [sectionsElement, setSectionsElement] =
    useState<HTMLElement | null>(null);

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'sections',
        title: t('tourSettingsTitle'),
        body: t('tourSettingsBody'),
        target: sectionsElement,
      },
    ],
    [t, sectionsElement],
  );

  return { setSectionsElement, steps };
}
