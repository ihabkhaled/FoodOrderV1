import { useApp } from '@/modules/session';
import { consentAllowsPurpose, TELEMETRY_PURPOSE } from '@/modules/telemetry';
import { Analytics } from '@/packages/vercel-analytics';
import { SpeedInsights } from '@/packages/vercel-speed-insights';

/**
 * Vercel Web Analytics and Speed Insights, mounted only where the visitor's
 * analytics consent allows them.
 *
 * Both send data to Vercel, so neither is unconditional:
 * - Speed Insights reports Core Web Vitals, which is operational telemetry, so
 *   it runs at "operational diagnostics only" and above.
 * - Web Analytics reports page views, which is product telemetry, so it needs
 *   "operational and product analytics" or higher.
 *
 * Choosing "Do not record analytics" mounts neither, which is what the privacy
 * screen promises.
 */
export function VercelInsights() {
  const { analyticsConsent } = useApp();
  const allowsOperational = consentAllowsPurpose(
    analyticsConsent,
    TELEMETRY_PURPOSE.operational,
  );
  const allowsProduct = consentAllowsPurpose(
    analyticsConsent,
    TELEMETRY_PURPOSE.product,
  );

  return (
    <>
      {allowsProduct ? <Analytics /> : null}
      {allowsOperational ? <SpeedInsights /> : null}
    </>
  );
}
