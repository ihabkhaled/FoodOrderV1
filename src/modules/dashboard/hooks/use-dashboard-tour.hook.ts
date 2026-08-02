import { useMemo, useState } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface DashboardTourViewModel {
  /** Callback refs: attach with `ref={...}` on the element to spotlight. */
  setStatsElement: (element: HTMLElement | null) => void;
  setCreateElement: (element: HTMLElement | null) => void;
  steps: FeatureTourStep[];
}

/**
 * Spotlight targets and copy for the dashboard tour. Steps without a target
 * centre their card, which suits the ones that explain a concept rather than
 * point at a control.
 */
export function useDashboardTour(): DashboardTourViewModel {
  const { t } = useApp();
  const [statsElement, setStatsElement] = useState<HTMLElement | null>(null);
  const [createElement, setCreateElement] = useState<HTMLElement | null>(null);

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'welcome',
        title: t('tourDashboardWelcomeTitle'),
        body: t('tourDashboardWelcomeBody'),
        target: null,
      },
      {
        key: 'stats',
        title: t('tourDashboardStatsTitle'),
        body: t('tourDashboardStatsBody'),
        target: statsElement,
      },
      {
        key: 'shared',
        title: t('tourDashboardSharedTitle'),
        body: t('tourDashboardSharedBody'),
        target: null,
      },
      {
        key: 'progress',
        title: t('tourDashboardProgressTitle'),
        body: t('tourDashboardProgressBody'),
        target: null,
      },
      {
        key: 'create',
        title: t('tourDashboardCreateTitle'),
        body: t('tourDashboardCreateBody'),
        target: createElement,
      },
      {
        key: 'nav',
        title: t('tourDashboardNavTitle'),
        body: t('tourDashboardNavBody'),
        target: null,
      },
    ],
    [t, statsElement, createElement],
  );

  return { setStatsElement, setCreateElement, steps };
}
