import type { AnalyticsConsent } from '@/modules/telemetry';

export interface AnalyticsConsentOption {
  value: AnalyticsConsent;
  label: string;
  description: string;
}
