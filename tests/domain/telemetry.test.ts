import { describe, expect, it } from 'vitest';

import {
  ANALYTICS_CONSENT,
  ANALYTICS_EVENT,
  assertAnalyticsObjectIsSafe,
  consentAllowsPurpose,
  createTelemetryEvent,
  RecordingAnalyticsService,
  RELIABILITY_ERROR_CATEGORY,
  type SafeTelemetryContext,
  TELEMETRY_PURPOSE,
  trackTelemetrySafely,
} from '@/modules/telemetry';

const occurredAt = '2026-07-18T14:00:00.000Z';

const context = (): SafeTelemetryContext => ({
  appVersion: '1.7.0',
  locale: 'en',
  platform: 'web',
  storageMode: 'local-device',
  plan: 'free',
  correlationId: 'correlation-1',
  sessionId: 'session-opaque-1',
  workspaceId: null,
  experimentAssignments: 'invite-flow:control',
});

describe('telemetry consent', () => {
  it('maps every purpose to the required consent level', () => {
    expect(
      consentAllowsPurpose(
        ANALYTICS_CONSENT.denied,
        TELEMETRY_PURPOSE.operational,
      ),
    ).toBe(false);
    expect(
      consentAllowsPurpose(
        ANALYTICS_CONSENT.operationalOnly,
        TELEMETRY_PURPOSE.operational,
      ),
    ).toBe(true);
    expect(
      consentAllowsPurpose(
        ANALYTICS_CONSENT.operationalOnly,
        TELEMETRY_PURPOSE.product,
      ),
    ).toBe(false);
    expect(
      consentAllowsPurpose(
        ANALYTICS_CONSENT.productAnalytics,
        TELEMETRY_PURPOSE.product,
      ),
    ).toBe(true);
    expect(
      consentAllowsPurpose(
        ANALYTICS_CONSENT.productAnalytics,
        TELEMETRY_PURPOSE.marketing,
      ),
    ).toBe(false);
    expect(
      consentAllowsPurpose(
        ANALYTICS_CONSENT.productAndMarketing,
        TELEMETRY_PURPOSE.marketing,
      ),
    ).toBe(true);
  });
});

describe('telemetry privacy guard', () => {
  it('accepts flat finite primitive properties', () => {
    expect(() =>
      { assertAnalyticsObjectIsSafe({
        itemCount: 3,
        isGuest: true,
        source: 'direct',
        optionalValue: null,
      }); },
    ).not.toThrow();
  });

  it.each([
    ['email', 'person@example.com'],
    ['display_name', 'Private Person'],
    ['paymentProof', 'proof-reference'],
    ['attachment-url', 'asset-reference'],
    ['note', 'private note'],
    ['inviteToken', 'secret-token'],
  ])('rejects forbidden key %s', (key, value) => {
    expect(() => { assertAnalyticsObjectIsSafe({ [key]: value }); }).toThrow(
      /forbidden/,
    );
  });

  it('rejects email values even under a safe-looking key', () => {
    expect(() =>
      { assertAnalyticsObjectIsSafe({ source: 'person@example.com' }); },
    ).toThrow(/email address/);
  });

  it('rejects URL values and oversized/free-form strings', () => {
    expect(() =>
      { assertAnalyticsObjectIsSafe({ source: 'https://example.com/private' }); },
    ).toThrow(/URL/);
    expect(() =>
      { assertAnalyticsObjectIsSafe({ source: 'x'.repeat(129) }); },
    ).toThrow(/128/);
  });

  it('rejects nested, undefined, and non-finite values', () => {
    expect(() => { assertAnalyticsObjectIsSafe({ nested: { unsafe: true } }); }).toThrow(
      /primitive/,
    );
    expect(() => { assertAnalyticsObjectIsSafe({ missing: undefined }); }).toThrow(
      /primitive/,
    );
    expect(() => { assertAnalyticsObjectIsSafe({ count: Number.NaN }); }).toThrow(
      /finite/,
    );
    expect(() =>
      { assertAnalyticsObjectIsSafe({ count: Number.POSITIVE_INFINITY }); },
    ).toThrow(/finite/);
  });
});

describe('typed event creation', () => {
  it('returns null when consent does not allow the event purpose', () => {
    expect(
      createTelemetryEvent({
        name: ANALYTICS_EVENT.publicInviteViewed,
        consent: ANALYTICS_CONSENT.operationalOnly,
        context: context(),
        properties: {
          source: 'direct',
          channel: 'unknown',
          isGuest: true,
          hasDeadline: true,
        },
        occurredAt,
      }),
    ).toBeNull();
  });

  it('creates a defensive typed product event when consent allows it', () => {
    const eventContext = context();
    const properties = {
      source: 'direct' as const,
      channel: 'whatsapp' as const,
      isGuest: true,
      hasDeadline: true,
    };
    const event = createTelemetryEvent({
      id: 'event-1',
      name: ANALYTICS_EVENT.publicInviteViewed,
      consent: ANALYTICS_CONSENT.productAnalytics,
      context: eventContext,
      properties,
      occurredAt,
    });

    expect(event).toEqual({
      id: 'event-1',
      name: 'public_invite_viewed',
      purpose: TELEMETRY_PURPOSE.product,
      occurredAt,
      context: eventContext,
      properties,
    });
    expect(event?.context).not.toBe(eventContext);
    expect(event?.properties).not.toBe(properties);
  });

  it('allows operational failures under operational consent', () => {
    expect(
      createTelemetryEvent({
        name: ANALYTICS_EVENT.gatewayError,
        consent: ANALYTICS_CONSENT.operationalOnly,
        context: context(),
        properties: {
          category: RELIABILITY_ERROR_CATEGORY.network,
          operation: 'load_active_sessions',
          errorCode: 'unavailable',
          retryable: true,
        },
        occurredAt,
      }),
    ).toMatchObject({ purpose: TELEMETRY_PURPOSE.operational });
  });

  it('rejects invalid occurrence time and unsafe context/properties', () => {
    expect(() =>
      createTelemetryEvent({
        name: ANALYTICS_EVENT.gatewayError,
        consent: ANALYTICS_CONSENT.operationalOnly,
        context: context(),
        properties: {
          category: RELIABILITY_ERROR_CATEGORY.network,
          operation: 'load',
          errorCode: 'unavailable',
          retryable: true,
        },
        occurredAt: 'invalid',
      }),
    ).toThrow(/occurrence time/);
    expect(() =>
      createTelemetryEvent({
        name: ANALYTICS_EVENT.gatewayError,
        consent: ANALYTICS_CONSENT.operationalOnly,
        context: { ...context(), correlationId: 'person@example.com' },
        properties: {
          category: RELIABILITY_ERROR_CATEGORY.network,
          operation: 'load',
          errorCode: 'unavailable',
          retryable: true,
        },
        occurredAt,
      }),
    ).toThrow(/email address/);
    expect(() =>
      createTelemetryEvent({
        name: ANALYTICS_EVENT.gatewayError,
        consent: ANALYTICS_CONSENT.operationalOnly,
        context: context(),
        properties: {
          category: RELIABILITY_ERROR_CATEGORY.network,
          operation: 'https://example.com',
          errorCode: 'unavailable',
          retryable: true,
        },
        occurredAt,
      }),
    ).toThrow(/URL/);
  });
});

describe('recording analytics adapter', () => {
  it('records only events allowed by its current consent and identity', () => {
    const service = new RecordingAnalyticsService();
    service.identify({ anonymousId: 'anonymous-1', authenticatedUserId: null });
    service.setConsent(ANALYTICS_CONSENT.productAnalytics);
    const productEvent = createTelemetryEvent({
      name: ANALYTICS_EVENT.sessionOpened,
      consent: ANALYTICS_CONSENT.productAnalytics,
      context: context(),
      properties: {
        status: 'collecting',
        participantCount: 3,
        itemCount: 8,
        isRecurring: false,
        isGuest: false,
      },
      occurredAt,
      id: 'event-product',
    });
    const marketingEvent = createTelemetryEvent({
      name: ANALYTICS_EVENT.upgradeClicked,
      consent: ANALYTICS_CONSENT.productAndMarketing,
      context: context(),
      properties: {
        plan: 'organizer_pro',
        entitlement: 'recurring_sessions',
        usageMeter: 'recurring_schedules',
        source: 'schedule_limit',
      },
      occurredAt,
      id: 'event-marketing',
    });

    expect(trackTelemetrySafely(service, productEvent)).toBe(true);
    expect(trackTelemetrySafely(service, marketingEvent)).toBe(true);
    expect(service.snapshot()).toMatchObject({
      consent: ANALYTICS_CONSENT.productAnalytics,
      identity: {
        anonymousId: 'anonymous-1',
        authenticatedUserId: null,
      },
    });
    expect(service.snapshot().events.map((event) => event.id)).toEqual([
      'event-product',
    ]);
  });

  it('resets identity and captured events', () => {
    const service = new RecordingAnalyticsService();
    service.setConsent(ANALYTICS_CONSENT.operationalOnly);
    service.identify({
      anonymousId: 'anonymous-1',
      authenticatedUserId: 'user-1',
    });
    const event = createTelemetryEvent({
      name: ANALYTICS_EVENT.callableError,
      consent: ANALYTICS_CONSENT.operationalOnly,
      context: context(),
      properties: {
        category: RELIABILITY_ERROR_CATEGORY.unavailable,
        operation: 'finalize_session',
        errorCode: 'unavailable',
        retryable: true,
      },
      occurredAt,
    });
    trackTelemetrySafely(service, event);
    service.reset();

    expect(service.snapshot()).toEqual({
      consent: ANALYTICS_CONSENT.operationalOnly,
      identity: null,
      events: [],
    });
  });

  it('never breaks a product action when an adapter throws', () => {
    const failingService = {
      setConsent: () => {},
      identify: () => {},
      reset: () => {},
      track: () => {
        throw new Error('analytics unavailable');
      },
    };
    const event = createTelemetryEvent({
      name: ANALYTICS_EVENT.gatewayError,
      consent: ANALYTICS_CONSENT.operationalOnly,
      context: context(),
      properties: {
        category: RELIABILITY_ERROR_CATEGORY.network,
        operation: 'load',
        errorCode: 'offline',
        retryable: true,
      },
      occurredAt,
    });

    expect(trackTelemetrySafely(failingService, event)).toBe(false);
    expect(trackTelemetrySafely(failingService, null)).toBe(false);
  });
});
