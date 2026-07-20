export {
  DEFAULT_ANALYTICS_CONSENT,
  isAnalyticsConsent,
  loadAnalyticsConsent,
  saveAnalyticsConsent,
} from './adapters/telemetry-consent.adapter';
export {
  ANALYTICS_EVENT,
  ANALYTICS_EVENT_PURPOSE,
  type AnalyticsEventName,
  FORBIDDEN_ANALYTICS_PROPERTY_KEYS,
} from './constants/analytics-events.constants';
export { ANALYTICS_CONSENT_PREFERENCE_KEY } from './constants/telemetry-storage.constants';
export {
  ANALYTICS_CONSENT,
  type AnalyticsConsent,
  RELIABILITY_ERROR_CATEGORY,
  type ReliabilityErrorCategory,
  TELEMETRY_PURPOSE,
  type TelemetryPurpose,
} from './enums/telemetry.enums';
export {
  assertAnalyticsObjectIsSafe,
  consentAllowsPurpose,
  createTelemetryEvent,
  type CreateTelemetryEventInput,
  RecordingAnalyticsService,
  trackTelemetrySafely,
} from './helpers/telemetry.helper';
export type {
  ActivationEventProperties,
  AnalyticsEventPropertiesMap,
  AnalyticsIdentity,
  AnalyticsPropertyValue,
  AnalyticsService,
  AuthEventProperties,
  ExportEventProperties,
  FeatureFlagExposureProperties,
  InviteEventProperties,
  MonetizationEventProperties,
  ReliabilityEventProperties,
  ReminderEventProperties,
  SafeTelemetryContext,
  SessionEventProperties,
  SettlementEventProperties,
  TelemetryEvent,
} from './types/telemetry.types';
