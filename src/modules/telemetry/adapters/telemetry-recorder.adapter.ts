import type {
  AnalyticsEventName,
} from '../constants/analytics-events.constants';
import {
  ANALYTICS_CONSENT,
  type AnalyticsConsent,
} from '../enums/telemetry.enums';
import { createTelemetryEvent } from '../helpers/telemetry.helper';
import type {
  AnalyticsEventPropertiesMap,
  SafeTelemetryContext,
} from '../types/telemetry.types';
import {
  appendTelemetryEvent,
  clearTelemetryBuffer,
  countTelemetryEvents,
} from './telemetry-buffer.adapter';

/**
 * The single sink every feature module records through.
 *
 * Consent is authoritative and starts denied: nothing is recorded until the
 * session boot resolves the stored preference. Events are written to a
 * device-local rolling window — no vendor SDK and no network egress exist.
 */
class DeviceDiagnosticsRecorder {
  private consent: AnalyticsConsent = ANALYTICS_CONSENT.denied;
  private context: SafeTelemetryContext | null = null;

  setConsent(consent: AnalyticsConsent): void {
    this.consent = consent;
  }

  getConsent(): AnalyticsConsent {
    return this.consent;
  }

  setContext(context: SafeTelemetryContext): void {
    this.context = context;
  }

  /**
   * Records one typed event when consent allows its purpose. Returns whether
   * anything was written so tests and the privacy screen can prove the gate.
   */
  record<EventName extends AnalyticsEventName>(
    name: EventName,
    properties: AnalyticsEventPropertiesMap[EventName],
  ): boolean {
    if (!this.context) return false;
    try {
      const event = createTelemetryEvent({
        name,
        context: this.context,
        properties,
        consent: this.consent,
      });
      if (!event) return false;
      appendTelemetryEvent(event);
      return true;
    } catch {
      // Redaction or storage failure must never break an ordering action.
      return false;
    }
  }

  count(): number {
    return countTelemetryEvents();
  }

  clear(): void {
    clearTelemetryBuffer();
  }
}

export const telemetryRecorder = new DeviceDiagnosticsRecorder();
