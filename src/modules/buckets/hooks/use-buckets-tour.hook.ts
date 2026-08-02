import { useMemo, useState } from 'react';

import { useApp } from '@/modules/session';
import type { FeatureTourStep } from '@/shared/ui';

export interface BucketsTourViewModel {
  /** Callback refs: attach with `ref={...}` on the element to spotlight. */
  setTemplateElement: (element: HTMLElement | null) => void;
  setRoundElement: (element: HTMLElement | null) => void;
  steps: FeatureTourStep[];
}

/** Spotlight targets and copy for the buckets tour. */
export function useBucketsTour(): BucketsTourViewModel {
  const { t } = useApp();
  const [templateElement, setTemplateElement] = useState<HTMLElement | null>(
    null,
  );
  const [roundElement, setRoundElement] = useState<HTMLElement | null>(null);

  const steps = useMemo<FeatureTourStep[]>(
    () => [
      {
        key: 'intro',
        title: t('tourBucketsIntroTitle'),
        body: t('tourBucketsIntroBody'),
        target: null,
      },
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
      {
        key: 'mine',
        title: t('tourBucketsMineTitle'),
        body: t('tourBucketsMineBody'),
        target: null,
      },
      {
        key: 'join',
        title: t('tourBucketsJoinTitle'),
        body: t('tourBucketsJoinBody'),
        target: null,
      },
      {
        key: 'delete',
        title: t('tourBucketsDeleteTitle'),
        body: t('tourBucketsDeleteBody'),
        target: null,
      },
    ],
    [t, templateElement, roundElement],
  );

  return { setTemplateElement, setRoundElement, steps };
}
