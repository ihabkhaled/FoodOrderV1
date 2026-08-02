import {
  readWebStorage,
  removeWebStorage,
  writeWebStorage,
} from '@/platform/storage';

import type { AnalyticsEventName } from '../constants/analytics-events.constants';
import { TELEMETRY_BUFFER_STORAGE_KEY } from '../constants/telemetry-storage.constants';
import type { TelemetryEvent } from '../types/telemetry.types';

/** Newest-first cap; diagnostics are a short rolling window, never an archive. */
export const MAX_BUFFERED_TELEMETRY_EVENTS = 200;

const isTelemetryEvent = (
  value: unknown,
): value is TelemetryEvent<AnalyticsEventName> => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<TelemetryEvent<AnalyticsEventName>>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.purpose === 'string' &&
    typeof candidate.occurredAt === 'string'
  );
};

/**
 * Reads the device-local diagnostics window. Unreadable or corrupted storage
 * yields an empty window rather than throwing — diagnostics never break a flow.
 */
export const readTelemetryBuffer = (): TelemetryEvent<AnalyticsEventName>[] => {
  const raw = readWebStorage(TELEMETRY_BUFFER_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isTelemetryEvent) : [];
  } catch {
    return [];
  }
};

export const appendTelemetryEvent = (
  event: TelemetryEvent<AnalyticsEventName>,
): void => {
  const next = [event, ...readTelemetryBuffer()].slice(
    0,
    MAX_BUFFERED_TELEMETRY_EVENTS,
  );
  try {
    writeWebStorage(TELEMETRY_BUFFER_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // A full or unavailable store must never interrupt the ordering action.
  }
};

export const clearTelemetryBuffer = (): void => {
  removeWebStorage(TELEMETRY_BUFFER_STORAGE_KEY);
};

export const countTelemetryEvents = (): number => readTelemetryBuffer().length;
