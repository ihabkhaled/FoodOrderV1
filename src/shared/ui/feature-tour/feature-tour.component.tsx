import { X } from '@/packages/icons';

import type { FeatureTourViewProps } from './feature-tour.types';

const SPOTLIGHT_PADDING = 8;

export function FeatureTourView({
  open,
  title,
  body,
  stepIndex,
  stepCount,
  spotlight,
  nextLabel,
  doneLabel,
  skipLabel,
  closeLabel,
  dontShowAgainLabel,
  dontShowAgain,
  reducedMotion,
  onNext,
  onSkip,
  onToggleDontShowAgain,
}: FeatureTourViewProps) {
  if (!open) return null;

  const isLastStep = stepIndex === stepCount - 1;
  // An oversized ring shadow dims everything except the highlighted box.
  const spotlightStyle = spotlight
    ? {
        top: `${spotlight.top - SPOTLIGHT_PADDING}px`,
        left: `${spotlight.left - SPOTLIGHT_PADDING}px`,
        width: `${spotlight.width + SPOTLIGHT_PADDING * 2}px`,
        height: `${spotlight.height + SPOTLIGHT_PADDING * 2}px`,
      }
    : undefined;

  return (
    <div
      className={`feature-tour${reducedMotion ? ' reduced-motion' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {spotlight ? (
        <div className="feature-tour-spotlight" style={spotlightStyle} />
      ) : (
        <div className="feature-tour-scrim" />
      )}

      <div className="feature-tour-card">
        <div className="feature-tour-head">
          <p className="eyebrow">
            {stepIndex + 1} / {stepCount}
          </p>
          <button
            type="button"
            className="icon-button"
            onClick={onSkip}
            aria-label={closeLabel}
            title={closeLabel}
          >
            <X />
          </button>
        </div>
        <h2>{title}</h2>
        <p>{body}</p>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => {
              onToggleDontShowAgain(event.target.checked);
            }}
          />
          {dontShowAgainLabel}
        </label>
        <div className="feature-tour-actions">
          <button type="button" className="button secondary" onClick={onSkip}>
            {skipLabel}
          </button>
          <button type="button" className="button" onClick={onNext}>
            {isLastStep ? doneLabel : nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
