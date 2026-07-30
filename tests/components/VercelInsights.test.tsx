import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ANALYTICS_CONSENT } from '@/modules/telemetry';

const analyticsMock = vi.fn();
const speedInsightsMock = vi.fn();
const consentValue = { current: ANALYTICS_CONSENT.denied as string };

vi.mock('@/packages/vercel-analytics', () => ({
  Analytics: () => {
    analyticsMock();
    return null;
  },
}));

vi.mock('@/packages/vercel-speed-insights', () => ({
  SpeedInsights: () => {
    speedInsightsMock();
    return null;
  },
}));

vi.mock('@/modules/session', () => ({
  useApp: () => ({ analyticsConsent: consentValue.current }),
}));

const { VercelInsights } = await import(
  '../../src/app/providers/vercel-insights.container'
);

const renderWithConsent = (consent: string): void => {
  consentValue.current = consent;
  analyticsMock.mockClear();
  speedInsightsMock.mockClear();
  render(<VercelInsights />);
};

describe('VercelInsights', () => {
  it('sends nothing to Vercel when analytics are declined', () => {
    renderWithConsent(ANALYTICS_CONSENT.denied);

    expect(analyticsMock).not.toHaveBeenCalled();
    expect(speedInsightsMock).not.toHaveBeenCalled();
  });

  it('reports page speed but not page views at operational consent', () => {
    renderWithConsent(ANALYTICS_CONSENT.operationalOnly);

    expect(speedInsightsMock).toHaveBeenCalledOnce();
    expect(analyticsMock).not.toHaveBeenCalled();
  });

  it('reports both once product analytics are allowed', () => {
    renderWithConsent(ANALYTICS_CONSENT.productAnalytics);

    expect(analyticsMock).toHaveBeenCalledOnce();
    expect(speedInsightsMock).toHaveBeenCalledOnce();
  });

  it('reports both at the marketing consent level', () => {
    renderWithConsent(ANALYTICS_CONSENT.productAndMarketing);

    expect(analyticsMock).toHaveBeenCalledOnce();
    expect(speedInsightsMock).toHaveBeenCalledOnce();
  });
});
