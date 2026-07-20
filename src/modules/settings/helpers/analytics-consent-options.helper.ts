import { ANALYTICS_CONSENT } from '@/modules/telemetry';

import type { SettingsMessageKey } from '../i18n/settings-messages.constants';
import type { AnalyticsConsentOption } from '../types/analytics-consent.types';

export const buildAnalyticsConsentOptions = (
  translate: (key: SettingsMessageKey) => string,
): readonly AnalyticsConsentOption[] => [
  {
    value: ANALYTICS_CONSENT.denied,
    label: translate('analyticsDenied'),
    description: translate('analyticsDeniedDescription'),
  },
  {
    value: ANALYTICS_CONSENT.operationalOnly,
    label: translate('analyticsOperationalOnly'),
    description: translate('analyticsOperationalDescription'),
  },
  {
    value: ANALYTICS_CONSENT.productAnalytics,
    label: translate('analyticsProduct'),
    description: translate('analyticsProductDescription'),
  },
  {
    value: ANALYTICS_CONSENT.productAndMarketing,
    label: translate('analyticsProductAndMarketing'),
    description: translate('analyticsMarketingDescription'),
  },
];
