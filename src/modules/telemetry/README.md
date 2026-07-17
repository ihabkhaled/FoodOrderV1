# telemetry

Consent-aware product analytics, operational reliability events, performance contracts, and feature-exposure tracking.

## Responsibility

- Owns the typed event registry for acquisition, activation, engagement, settlement, monetization, reliability, and experiments.
- Assigns every event an operational, product, or marketing purpose.
- Enforces consent before an event is created or recorded.
- Rejects forbidden PII keys, email-looking values, URLs, non-finite numbers, nested/free-form payloads, and oversized strings.
- Provides safe context contracts for app version, locale, platform, storage mode, plan, correlation, session, workspace, and experiment assignment.
- Provides a deterministic in-memory adapter for local mode and tests.
- Ensures analytics adapter failure never breaks an ordering action.

## Public surface (`@/modules/telemetry`)

- Event names, purposes, consent values, reliability categories, and performance measure identifiers.
- Event-specific property contracts and adapter interfaces.
- Consent and privacy helpers.
- `RecordingAnalyticsService` for deterministic local/test capture.

## Privacy boundary

Telemetry must never include email, telephone, full/display name, address, invitation token, note/message, attachment location, payment proof/reference, password, raw error payload, URL, or arbitrary nested object. Opaque product identifiers are permitted only where documented and access to analytics remains controlled.

Operational telemetry may run only under an explicit operational-or-higher consent state. Product and marketing purposes require their corresponding consent. Revoking consent stops future optional events; events are never replayed later.

## Integration boundary

A production analytics/error/performance vendor requires:

1. a registered package owner facade under `src/packages/<vendor>`;
2. a platform/configuration adapter;
3. environment validation;
4. redaction tests;
5. an unconfigured/no-op state;
6. documented retention and dashboard ownership.

Feature modules emit only typed module-surface events. They never import a vendor SDK.

## Testing

`tests/domain/telemetry.test.ts` covers purpose/consent combinations, typed event creation, PII and free-text rejection, adapter failures, identity/reset behavior, and defensive event copies.
