import { useMemo, useState } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface DashboardTourViewModel {
  /** Callback refs: attach with `ref={...}` on the element to spotlight. */
  setStatsElement: (element: HTMLElement | null) => void;
  setCreateElement: (element: HTMLElement | null) => void;
  steps: FeatureTourStep[];
}

/** Spotlight targets and copy for the dashboard tour. */
export function useDashboardTour(): DashboardTourViewModel {
  const { t } = useApp();
  const [statsElement, setStatsElement] = useState<HTMLElement | null>(null);
  const [createElement, setCreateElement] = useState<HTMLElement | null>(null);

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'stats',
        title: t('tourDashboardStatsTitle'),
        body: t('tourDashboardStatsBody'),
        target: statsElement,
      },
      {
        key: 'create',
        title: t('tourDashboardCreateTitle'),
        body: t('tourDashboardCreateBody'),
        target: createElement,
      },
    ],
    [t, statsElement, createElement],
  );

  return { setStatsElement, setCreateElement, steps };
}
