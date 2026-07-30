import { useMemo, useState } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface OrdersTourViewModel {
  /** Callback ref: attach with `ref={...}` on the element to spotlight. */
  setListElement: (element: HTMLElement | null) => void;
  steps: FeatureTourStep[];
}

/** Spotlight targets and copy for the orders tour. */
export function useOrdersTour(): OrdersTourViewModel {
  const { t } = useApp();
  const [listElement, setListElement] =
    useState<HTMLElement | null>(null);

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'list',
        title: t('tourOrdersListTitle'),
        body: t('tourOrdersListBody'),
        target: listElement,
      },
    ],
    [t, listElement],
  );

  return { setListElement, steps };
}
