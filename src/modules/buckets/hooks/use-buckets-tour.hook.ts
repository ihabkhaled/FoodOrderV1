import { useMemo, useState } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface BucketsTourViewModel {
  /** Callback ref: attach with `ref={...}` on the element to spotlight. */
  setTemplateElement: (element: HTMLElement | null) => void;
  /** Callback ref: attach with `ref={...}` on the element to spotlight. */
  setRoundElement: (element: HTMLElement | null) => void;
  steps: FeatureTourStep[];
}

/** Spotlight targets and copy for the buckets tour. */
export function useBucketsTour(): BucketsTourViewModel {
  const { t } = useApp();
  const [templateElement, setTemplateElement] =
    useState<HTMLElement | null>(null);
  const [roundElement, setRoundElement] =
    useState<HTMLElement | null>(null);

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'template',
        title: t('tourBucketsTemplateTitle'),
        body: t('tourBucketsTemplateBody'),
        target: templateElement,
      },
      {
        key: 'round',
        title: t('tourBucketsRoundTitle'),
        body: t('tourBucketsRoundBody'),
        target: roundElement,
      },
    ],
    [t, templateElement, roundElement],
  );

  return { setTemplateElement, setRoundElement, steps };
}
