import type { AnalyticsEventName } from '../constants/analytics-events.constants';
import type {
  AnalyticsConsent,
  ReliabilityErrorCategory,
  TelemetryPurpose,
} from '../enums/telemetry.enums';

export type AnalyticsPropertyValue = string | number | boolean | null;

export interface SafeTelemetryContext {
  appVersion: string;
  locale: 'en' | 'ar';
  platform: 'web' | 'android' | 'ios';
  storageMode: 'firebase' | 'local-device';
  plan: string;
  correlationId: string;
  sessionId: string | null;
  workspaceId: string | null;
  experimentAssignments: string | null;
}

export interface InviteEventProperties {
  source: 'direct' | 'social' | 'group' | 'unknown';
  channel: 'native_share' | 'clipboard' | 'whatsapp' | 'qr' | 'unknown';
  isGuest: boolean;
  hasDeadline: boolean;
}

export interface AuthEventProperties {
  method: 'email_password' | 'magic_link' | 'guest' | 'account_link';
  returnToInvite: boolean;
}

export interface ActivationEventProperties {
  itemCount: number;
  participantCount: number;
  isFirstValueMoment: boolean;
}

export interface SessionEventProperties {
  status: string;
  participantCount: number;
  itemCount: number;
  isRecurring: boolean;
  isGuest: boolean;
}

export interface ReminderEventProperties {
  channel: 'in_app' | 'push' | 'email';
  recipientCount: number;
  reminderType: string;
}

export interface ExportEventProperties {
  format: 'whatsapp' | 'print' | 'pdf' | 'csv';
  participantCount: number;
  itemCount: number;
}

export interface SettlementEventProperties {
  paymentStatus: string;
  participantCount: number;
  differenceMinor: number;
  allocationStrategy: string;
}

export interface MonetizationEventProperties {
  plan: string;
  entitlement: string | null;
  usageMeter: string | null;
  source: string;
}

export interface ReliabilityEventProperties {
  category: ReliabilityErrorCategory;
  operation: string;
  errorCode: string;
  retryable: boolean;
}

export interface FeatureFlagExposureProperties {
  flag: string;
  variant: string;
}

export interface AnalyticsEventPropertiesMap {
  invite_link_created: InviteEventProperties;
  invite_link_shared: InviteEventProperties;
  public_invite_viewed: InviteEventProperties;
  guest_flow_started: AuthEventProperties;
  auth_flow_started: AuthEventProperties;
  registration_completed: AuthEventProperties;
  guest_account_linked: AuthEventProperties;
  first_menu_created: ActivationEventProperties;
  first_session_opened: ActivationEventProperties;
  first_invite_shared: ActivationEventProperties;
  first_participant_joined: ActivationEventProperties;
  first_contribution_submitted: ActivationEventProperties;
  first_order_finalized: ActivationEventProperties;
  first_session_settled: ActivationEventProperties;
  session_opened: SessionEventProperties;
  contribution_changed: SessionEventProperties;
  participant_marked_done: SessionEventProperties;
  participant_skipped: SessionEventProperties;
  reminder_sent: ReminderEventProperties;
  repeat_selection_used: SessionEventProperties;
  recurring_schedule_created: SessionEventProperties;
  restaurant_handoff_exported: ExportEventProperties;
  receipt_reconciled: SettlementEventProperties;
  payment_declared: SettlementEventProperties;
  payment_verified: SettlementEventProperties;
  plan_viewed: MonetizationEventProperties;
  upgrade_prompt_viewed: MonetizationEventProperties;
  upgrade_clicked: MonetizationEventProperties;
  trial_started: MonetizationEventProperties;
  checkout_started: MonetizationEventProperties;
  checkout_completed: MonetizationEventProperties;
  checkout_failed: ReliabilityEventProperties;
  subscription_changed: MonetizationEventProperties;
  entitlement_blocked: MonetizationEventProperties;
  usage_limit_reached: MonetizationEventProperties;
  gateway_error: ReliabilityEventProperties;
  callable_error: ReliabilityEventProperties;
  schedule_failure: ReliabilityEventProperties;
  sync_conflict: ReliabilityEventProperties;
  offline_queue_failed: ReliabilityEventProperties;
  attachment_upload_failed: ReliabilityEventProperties;
  migration_failure: ReliabilityEventProperties;
  feature_flag_exposed: FeatureFlagExposureProperties;
}

export interface TelemetryEvent<EventName extends AnalyticsEventName> {
  id: string;
  name: EventName;
  purpose: TelemetryPurpose;
  occurredAt: string;
  context: SafeTelemetryContext;
  properties: AnalyticsEventPropertiesMap[EventName];
}

export interface AnalyticsIdentity {
  anonymousId: string;
  authenticatedUserId: string | null;
}

export interface AnalyticsService {
  setConsent(consent: AnalyticsConsent): void;
  identify(identity: AnalyticsIdentity): void;
  reset(): void;
  track<EventName extends AnalyticsEventName>(
    event: TelemetryEvent<EventName>,
  ): void;
}
