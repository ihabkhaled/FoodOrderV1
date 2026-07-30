import type { ElementRect } from '@/platform/browser';

/** One stop on a page tour: what to highlight and what to say about it. */
export interface FeatureTourStep {
  readonly key: string;
  readonly title: string;
  readonly body: string;
  /** Currently mounted element to spotlight; null centres the card instead. */
  readonly target: HTMLElement | null;
}

export interface FeatureTourViewProps {
  readonly open: boolean;
  readonly title: string;
  readonly body: string;
  readonly stepIndex: number;
  readonly stepCount: number;
  readonly spotlight: ElementRect | null;
  readonly nextLabel: string;
  readonly doneLabel: string;
  readonly skipLabel: string;
  readonly closeLabel: string;
  readonly dontShowAgainLabel: string;
  readonly dontShowAgain: boolean;
  readonly reducedMotion: boolean;
  readonly onNext: () => void;
  readonly onSkip: () => void;
  readonly onToggleDontShowAgain: (value: boolean) => void;
}
