import { createId, nowIso } from '@/shared/helpers';

import {
  ANALYTICS_EVENT_PURPOSE,
  FORBIDDEN_ANALYTICS_PROPERTY_KEYS,
  type AnalyticsEventName,
} from '../constants/analytics-events.constants';
import {
  ANALYTICS_CONSENT,
  TELEMETRY_PURPOSE,
  type AnalyticsConsent,
  type TelemetryPurpose,
} from '../enums/telemetry.enums';
import type {
  AnalyticsEventPropertiesMap,
  AnalyticsIdentity,
  AnalyticsPropertyValue,
  AnalyticsService,
  SafeTelemetryContext,
  TelemetryEvent,
} from '../types/telemetry.types';

const MAX_PROPERTY_STRING_LENGTH = 128;
const EMAIL_VALUE_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u;
const URL_VALUE_PATTERN = /\b(?:https?:\/\/|www\.)\S+/iu;

const normalizedForbiddenKeys = new Set(
  [...FORBIDDEN_ANALYTICS_PROPERTY_KEYS].map((key) =>
    key.replaceAll(/[^a-z0-9]/giu, '').toLowerCase(),
  ),
);

const normalizePropertyKey = (key: string): string =>
  key.replaceAll(/[^a-z0-9]/giu, '').toLowerCase();

const assertSafeStringValue = (value: string, key: string): void => {
  if (value.length > MAX_PROPERTY_STRING_LENGTH) {
    throw new Error(
      `Analytics property ${key} exceeds ${MAX_PROPERTY_STRING_LENGTH} characters.`,
    );
  }
  if (EMAIL_VALUE_PATTERN.test(value)) {
    throw new Error(`Analytics property ${key} contains an email address.`);
  }
  if (URL_VALUE_PATTERN.test(value)) {
    throw new Error(`Analytics property ${key} contains a URL.`);
  }
};

const assertSafePropertyValue = (
  value: unknown,
  key: string,
): asserts value is AnalyticsPropertyValue => {
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Analytics property ${key} must be a finite number.`);
    }
    return;
  }
  if (typeof value === 'string') {
    assertSafeStringValue(value, key);
    return;
  }
  throw new Error(`Analytics property ${key} must be a primitive safe value.`);
};

export const assertAnalyticsObjectIsSafe = (value: object): void => {
  for (const [key, propertyValue] of Object.entries(value)) {
    if (normalizedForbiddenKeys.has(normalizePropertyKey(key))) {
      throw new Error(`Analytics property ${key} is forbidden.`);
    }
    assertSafePropertyValue(propertyValue, key);
  }
};

export const consentAllowsPurpose = (
  consent: AnalyticsConsent,
  purpose: TelemetryPurpose,
): boolean => {
  if (consent === ANALYTICS_CONSENT.denied) return false;
  if (purpose === TELEMETRY_PURPOSE.operational) return true;
  if (consent === ANALYTICS_CONSENT.operationalOnly) return false;
  if (purpose === TELEMETRY_PURPOSE.product) return true;
  return consent === ANALYTICS_CONSENT.productAndMarketing;
};

export interface CreateTelemetryEventInput<EventName extends AnalyticsEventName> {
  name: EventName;
  context: SafeTelemetryContext;
  properties: AnalyticsEventPropertiesMap[EventName];
  consent: AnalyticsConsent;
  occurredAt?: string;
  id?: string;
}

export const createTelemetryEvent = <EventName extends AnalyticsEventName>(
  input: CreateTelemetryEventInput<EventName>,
): TelemetryEvent<EventName> | null => {
  const purpose = ANALYTICS_EVENT_PURPOSE[input.name];
  if (!consentAllowsPurpose(input.consent, purpose)) return null;

  const occurredAt = input.occurredAt ?? nowIso();
  if (Number.isNaN(Date.parse(occurredAt))) {
    throw new Error('Telemetry occurrence time must be a valid ISO timestamp.');
  }
  assertAnalyticsObjectIsSafe(input.context);
  assertAnalyticsObjectIsSafe(input.properties);

  return {
    id: input.id?.trim() || createId('telemetry'),
    name: input.name,
    purpose,
    occurredAt,
    context: { ...input.context },
    properties: { ...input.properties },
  };
};

export const trackTelemetrySafely = <EventName extends AnalyticsEventName>(
  service: AnalyticsService,
  event: TelemetryEvent<EventName> | null,
): boolean => {
  if (!event) return false;
  try {
    service.track(event);
    return true;
  } catch {
    return false;
  }
};

export class RecordingAnalyticsService implements AnalyticsService {
  private consent: AnalyticsConsent = ANALYTICS_CONSENT.denied;
  private identity: AnalyticsIdentity | null = null;
  private readonly events: TelemetryEvent<AnalyticsEventName>[] = [];

  setConsent(consent: AnalyticsConsent): void {
    this.consent = consent;
  }

  identify(identity: AnalyticsIdentity): void {
    this.identity = { ...identity };
  }

  reset(): void {
    this.identity = null;
    this.events.length = 0;
  }

  track<EventName extends AnalyticsEventName>(
    event: TelemetryEvent<EventName>,
  ): void {
    if (!consentAllowsPurpose(this.consent, event.purpose)) return;
    assertAnalyticsObjectIsSafe(event.context);
    assertAnalyticsObjectIsSafe(event.properties);
    this.events.push(event);
  }

  snapshot(): {
    consent: AnalyticsConsent;
    identity: AnalyticsIdentity | null;
    events: readonly TelemetryEvent<AnalyticsEventName>[];
  } {
    return {
      consent: this.consent,
      identity: this.identity ? { ...this.identity } : null,
      events: structuredClone(this.events),
    };
  }
}
