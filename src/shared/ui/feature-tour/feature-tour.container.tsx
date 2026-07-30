import type { TourPage } from '@/platform/device';

import { FeatureTourView } from './feature-tour.component';
import type { FeatureTourStep } from './feature-tour.types';
import { useFeatureTour } from './use-feature-tour.hook';

export function FeatureTour({
  page,
  steps,
  nextLabel,
  doneLabel,
  skipLabel,
  skipAllLabel,
  closeLabel,
}: {
  page: TourPage;
  steps: readonly FeatureTourStep[];
  nextLabel: string;
  doneLabel: string;
  skipLabel: string;
  skipAllLabel: string;
  closeLabel: string;
}) {
  const vm = useFeatureTour(page, steps);
  const step = steps[vm.stepIndex];
  if (!step) return null;

  return (
    <FeatureTourView
      open={vm.open}
      title={step.title}
      body={step.body}
      stepIndex={vm.stepIndex}
      stepCount={steps.length}
      spotlight={vm.spotlight}
      nextLabel={nextLabel}
      doneLabel={doneLabel}
      skipLabel={skipLabel}
      skipAllLabel={skipAllLabel}
      closeLabel={closeLabel}
      reducedMotion={vm.reducedMotion}
      onNext={vm.next}
      onSkip={vm.skip}
      onSkipAll={vm.skipAll}
    />
  );
}
