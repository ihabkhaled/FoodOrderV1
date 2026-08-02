import { beforeEach, describe, expect, it } from 'vitest';

import type { AnalyticsConsentLevel } from '@/modules/data-access';
import {
  ANALYTICS_CONSENT,
  ANALYTICS_EVENT,
  type AnalyticsConsent,
  clearTelemetryBuffer,
  countTelemetryEvents,
  MAX_BUFFERED_TELEMETRY_EVENTS,
  readTelemetryBuffer,
  type SafeTelemetryContext,
  telemetryRecorder,
} from '@/modules/telemetry';

const context: SafeTelemetryContext = {
  appVersion: '1.8.0',
  locale: 'en',
  platform: 'web',
  storageMode: 'local-device',
  plan: 'free',
  correlationId: 'u:test',
  sessionId: null,
  workspaceId: null,
  experimentAssignments: null,
};

const alphabetically = (left: string, right: string): number =>
  left.localeCompare(right);

const reliabilityProperties = {
  category: 'internal',
  operation: 'profile_load',
  errorCode: 'Error',
  retryable: true,
} as const;

const productProperties = {
  method: 'email_password',
  returnToInvite: false,
} as const;

describe('device diagnostics recorder', () => {
  beforeEach(() => {
    localStorage.clear();
    clearTelemetryBuffer();
    telemetryRecorder.setContext(context);
    telemetryRecorder.setConsent(ANALYTICS_CONSENT.denied);
  });

  it('records nothing at all while consent is denied', () => {
    const recorded = telemetryRecorder.record(
      ANALYTICS_EVENT.gatewayError,
      reliabilityProperties,
    );

    expect(recorded).toBe(false);
    expect(countTelemetryEvents()).toBe(0);
  });

  it('records operational events but suppresses product events at operational-only consent', () => {
    telemetryRecorder.setConsent(ANALYTICS_CONSENT.operationalOnly);

    expect(
      telemetryRecorder.record(ANALYTICS_EVENT.gatewayError, reliabilityProperties),
    ).toBe(true);
    expect(
      telemetryRecorder.record(
        ANALYTICS_EVENT.registrationCompleted,
        productProperties,
      ),
    ).toBe(false);

    const stored = readTelemetryBuffer();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.name).toBe(ANALYTICS_EVENT.gatewayError);
    expect(stored[0]?.purpose).toBe('operational');
  });

  it('records product events once product analytics are allowed', () => {
    telemetryRecorder.setConsent(ANALYTICS_CONSENT.productAnalytics);

    expect(
      telemetryRecorder.record(
        ANALYTICS_EVENT.registrationCompleted,
        productProperties,
      ),
    ).toBe(true);
    expect(countTelemetryEvents()).toBe(1);
  });

  it('keeps the newest events and caps the rolling window', () => {
    telemetryRecorder.setConsent(ANALYTICS_CONSENT.operationalOnly);

    for (let index = 0; index < MAX_BUFFERED_TELEMETRY_EVENTS + 25; index += 1) {
      telemetryRecorder.record(ANALYTICS_EVENT.gatewayError, {
        ...reliabilityProperties,
        operation: `operation_${index}`,
      });
    }

    const stored = readTelemetryBuffer();
    expect(stored).toHaveLength(MAX_BUFFERED_TELEMETRY_EVENTS);
    expect(stored[0]?.properties).toMatchObject({
      operation: `operation_${MAX_BUFFERED_TELEMETRY_EVENTS + 24}`,
    });
  });

  it('clears the window on request', () => {
    telemetryRecorder.setConsent(ANALYTICS_CONSENT.operationalOnly);
    telemetryRecorder.record(ANALYTICS_EVENT.gatewayError, reliabilityProperties);
    expect(countTelemetryEvents()).toBe(1);

    telemetryRecorder.clear();

    expect(countTelemetryEvents()).toBe(0);
  });

  it('survives corrupted storage without throwing', () => {
    localStorage.setItem('foodorder:v1:diagnostics', 'not-json');

    expect(readTelemetryBuffer()).toEqual([]);
    expect(countTelemetryEvents()).toBe(0);
  });
});

describe('persisted consent union', () => {
  it('matches the telemetry consent values exactly', () => {
    // The data-access profile field restates the union because a persisted
    // layer may not import a feature module; this guards the duplication.
    const persisted: AnalyticsConsentLevel[] = [
      'denied',
      'operational_only',
      'product_analytics',
      'product_and_marketing',
    ];
    const telemetry: AnalyticsConsent[] = Object.values(ANALYTICS_CONSENT);

    expect(persisted.toSorted(alphabetically)).toEqual(
      telemetry.toSorted(alphabetically),
    );
  });
});
