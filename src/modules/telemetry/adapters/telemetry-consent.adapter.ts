import { getPreference, setPreference } from '@/platform/storage';

import { ANALYTICS_CONSENT_PREFERENCE_KEY } from '../constants/telemetry-storage.constants';
import {
  ANALYTICS_CONSENT,
  type AnalyticsConsent,
} from '../enums/telemetry.enums';

const ANALYTICS_CONSENT_VALUES = new Set<AnalyticsConsent>(
  Object.values(ANALYTICS_CONSENT),
);

export const DEFAULT_ANALYTICS_CONSENT =
  ANALYTICS_CONSENT.operationalOnly;

export const isAnalyticsConsent = (
  value: string | null,
): value is AnalyticsConsent =>
  value !== null && ANALYTICS_CONSENT_VALUES.has(value as AnalyticsConsent);

export const loadAnalyticsConsent = async (): Promise<AnalyticsConsent> => {
  const stored = await getPreference(ANALYTICS_CONSENT_PREFERENCE_KEY);
  return isAnalyticsConsent(stored) ? stored : DEFAULT_ANALYTICS_CONSENT;
};

export const saveAnalyticsConsent = async (
  consent: AnalyticsConsent,
): Promise<void> => {
  await setPreference(ANALYTICS_CONSENT_PREFERENCE_KEY, consent);
};
