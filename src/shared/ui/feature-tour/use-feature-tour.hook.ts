import { useCallback, useEffect, useState } from 'react';

import type { ElementRect } from '@/platform/browser';
import {
  measureElementRect,
  prefersReducedMotion,
  subscribeToViewportChanges,
} from '@/platform/browser';
import type { TourPage } from '@/platform/device';
import {
  loadTourDismissed,
  saveAllToursDismissed,
  saveTourDismissed,
} from '@/platform/device';

import type { FeatureTourStep } from './feature-tour.types';

export interface FeatureTourViewModel {
  open: boolean;
  stepIndex: number;
  spotlight: ElementRect | null;
  reducedMotion: boolean;
  next: () => void;
  skip: () => void;
  skipAll: () => void;
}

const sameRect = (
  left: ElementRect | null,
  right: ElementRect | null,
): boolean => {
  if (left === null || right === null) return left === right;
  return (
    left.top === right.top &&
    left.left === right.left &&
    left.width === right.width &&
    left.height === right.height
  );
};

/**
 * Drives one page's guided tour.
 *
 * The three exits are deliberately different:
 * - `next` on the final step finishes the tour and silences **this page**.
 * - `skip` closes the rest of **this visit** only, so the tour returns later.
 * - `skipAll` silences **every** tour in the app.
 */
export function useFeatureTour(
  page: TourPage,
  steps: readonly FeatureTourStep[],
): FeatureTourViewModel {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<ElementRect | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const stepCount = steps.length;
  const target = steps[stepIndex]?.target ?? null;

  useEffect(() => {
    let active = true;
    void loadTourDismissed(page)
      .then((dismissed) => {
        if (active && !dismissed && stepCount > 0) setOpen(true);
      })
      .catch(() => {
        // A tour that cannot read its flag simply stays closed.
      });
    return () => {
      active = false;
    };
  }, [page, stepCount]);

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
  }, []);

  useEffect(() => {
    if (!open) return;
    // Only publish a genuinely different box, otherwise every scroll event
    // would produce a new object and re-run this effect forever.
    const remeasure = (): void => {
      const next = measureElementRect(target);
      setSpotlight((current) => (sameRect(current, next) ? current : next));
    };
    remeasure();
    return subscribeToViewportChanges(remeasure);
  }, [open, target]);

  const close = useCallback(() => {
    setOpen(false);
    setStepIndex(0);
  }, []);

  const next = useCallback(() => {
    setStepIndex((current) => {
      if (current + 1 < stepCount) return current + 1;
      void saveTourDismissed(page);
      close();
      return 0;
    });
  }, [close, page, stepCount]);

  const skipAll = useCallback(() => {
    void saveAllToursDismissed();
    close();
  }, [close]);

  return {
    open,
    stepIndex,
    spotlight,
    reducedMotion,
    next,
    skip: close,
    skipAll,
  };
}
