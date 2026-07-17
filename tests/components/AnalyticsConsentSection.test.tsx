import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ANALYTICS_CONSENT } from '@/modules/telemetry';
import { AnalyticsConsentSection } from '../../src/modules/settings/components/analytics-consent-section/analytics-consent-section.component';

const options = [
  {
    value: ANALYTICS_CONSENT.denied,
    label: 'No analytics',
    description: 'Ordering continues normally.',
  },
  {
    value: ANALYTICS_CONSENT.operationalOnly,
    label: 'Operational only',
    description: 'Reliability diagnostics.',
  },
  {
    value: ANALYTICS_CONSENT.productAnalytics,
    label: 'Product analytics',
    description: 'Anonymous product usage.',
  },
  {
    value: ANALYTICS_CONSENT.productAndMarketing,
    label: 'Product and upgrade analytics',
    description: 'Anonymous upgrade funnel.',
  },
] as const;

describe('AnalyticsConsentSection', () => {
  it('renders an accessible radio group with the selected consent', () => {
    render(
      <AnalyticsConsentSection
        heading="Analytics and privacy"
        description="Choose privacy settings"
        legend="Analytics consent"
        value={ANALYTICS_CONSENT.operationalOnly}
        disabled={false}
        options={options}
        onChange={() => {}}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Analytics and privacy' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Analytics consent' })).toBeVisible();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByRole('radio', { name: /Operational only/ })).toBeChecked();
  });

  it('reports the exact selected consent', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AnalyticsConsentSection
        heading="Analytics and privacy"
        description="Choose privacy settings"
        legend="Analytics consent"
        value={ANALYTICS_CONSENT.operationalOnly}
        disabled={false}
        options={options}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('radio', { name: /No analytics/ }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(ANALYTICS_CONSENT.denied);
  });

  it('disables every option while consent is loading or saving', () => {
    render(
      <AnalyticsConsentSection
        heading="Analytics and privacy"
        description="Choose privacy settings"
        legend="Analytics consent"
        value={ANALYTICS_CONSENT.operationalOnly}
        disabled
        options={options}
        onChange={() => {}}
      />,
    );

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }
  });
});
