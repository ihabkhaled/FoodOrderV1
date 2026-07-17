import {
  ANALYTICS_CONSENT,
  type AnalyticsConsent,
} from '@/modules/telemetry';

import type { AnalyticsConsentOption } from '../../types/analytics-consent.types';

interface AnalyticsConsentSectionProps {
  heading: string;
  description: string;
  legend: string;
  value: AnalyticsConsent;
  disabled: boolean;
  options: readonly AnalyticsConsentOption[];
  onChange: (value: AnalyticsConsent) => void;
}

const ANALYTICS_CONSENT_ORDER: readonly AnalyticsConsent[] = [
  ANALYTICS_CONSENT.denied,
  ANALYTICS_CONSENT.operationalOnly,
  ANALYTICS_CONSENT.productAnalytics,
  ANALYTICS_CONSENT.productAndMarketing,
];

export function AnalyticsConsentSection({
  heading,
  description,
  legend,
  value,
  disabled,
  options,
  onChange,
}: AnalyticsConsentSectionProps) {
  const optionsByValue = new Map(
    options.map((option) => [option.value, option]),
  );

  return (
    <section className="section-card stack">
      <div className="section-heading">
        <div>
          <h2>{heading}</h2>
          <p className="muted">{description}</p>
        </div>
      </div>
      <fieldset className="stack" disabled={disabled}>
        <legend className="sr-only">{legend}</legend>
        {ANALYTICS_CONSENT_ORDER.map((consent) => {
          const option = optionsByValue.get(consent);
          if (!option) return null;
          return (
            <label className="choice-card" key={consent}>
              <input
                type="radio"
                name="analytics-consent"
                value={consent}
                checked={value === consent}
                onChange={() => {
                  onChange(consent);
                }}
              />
              <span className="stack-xs">
                <strong>{option.label}</strong>
                <span className="muted">{option.description}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
    </section>
  );
}
