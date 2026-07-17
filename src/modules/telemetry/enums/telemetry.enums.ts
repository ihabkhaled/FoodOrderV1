export const ANALYTICS_CONSENT = {
  denied: 'denied',
  operationalOnly: 'operational_only',
  productAnalytics: 'product_analytics',
  productAndMarketing: 'product_and_marketing',
} as const;

export type AnalyticsConsent =
  (typeof ANALYTICS_CONSENT)[keyof typeof ANALYTICS_CONSENT];

export const TELEMETRY_PURPOSE = {
  operational: 'operational',
  product: 'product',
  marketing: 'marketing',
} as const;

export type TelemetryPurpose =
  (typeof TELEMETRY_PURPOSE)[keyof typeof TELEMETRY_PURPOSE];

export const RELIABILITY_ERROR_CATEGORY = {
  validation: 'validation',
  authentication: 'authentication',
  authorization: 'authorization',
  conflict: 'conflict',
  offline: 'offline',
  network: 'network',
  unavailable: 'unavailable',
  quota: 'quota',
  storage: 'storage',
  migration: 'migration',
  schedule: 'schedule',
  billing: 'billing',
  internal: 'internal',
} as const;

export type ReliabilityErrorCategory =
  (typeof RELIABILITY_ERROR_CATEGORY)[keyof typeof RELIABILITY_ERROR_CATEGORY];

export const PERFORMANCE_MEASURE = {
  appBootstrap: 'app_bootstrap',
  authResolution: 'auth_resolution',
  publicInvitePreview: 'public_invite_preview',
  activeSessionsReady: 'active_sessions_ready',
  contributionReady: 'contribution_ready',
  contributionMutation: 'contribution_mutation',
  organizerCommandCenterReady: 'organizer_command_center_ready',
  sessionFinalization: 'session_finalization',
  receiptRender: 'receipt_render',
  attachmentUpload: 'attachment_upload',
  checkoutOpen: 'checkout_open',
} as const;

export type PerformanceMeasure =
  (typeof PERFORMANCE_MEASURE)[keyof typeof PERFORMANCE_MEASURE];
