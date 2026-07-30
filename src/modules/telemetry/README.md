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
- `telemetryRecorder` — the single sink feature modules record through.
- Diagnostics window helpers (`readTelemetryBuffer`, `countTelemetryEvents`, `clearTelemetryBuffer`).
- `RecordingAnalyticsService` for deterministic local/test capture.

## Where events are recorded (v1.8.0)

Consent gates a real sink: `telemetryRecorder.record()` writes typed events to a
device-local rolling window of at most 200 entries
(`foodorder:v1:diagnostics`). Nothing is uploaded and no vendor SDK exists, so
`denied` genuinely records nothing and the privacy screen can show the exact
stored count and erase it.

Current producers:

| Event | Purpose | Site |
| --- | --- | --- |
| `auth_flow_started` | product | session login |
| `registration_completed` | product | session registration |
| `first_menu_created` | product | bucket duplication |
| `repeat_selection_used` | product | order repeat |
| `gateway_error` | operational | session profile-load failure |

The session controller owns consent and context: consent resolves from the
signed-in profile first (so the choice roams across devices) and falls back to
the device preference; context carries app version, locale, platform, storage
mode, and a truncated correlation id — never an email, name, or free text.

## Privacy boundary

Telemetry must never include email, telephone, full/display name, address, invitation token, note/message, attachment location, payment proof/reference, password, raw error payload, URL, or arbitrary nested object. Opaque product identifiers are permitted only where documented and access to analytics remains controlled.

Operational telemetry may run only under an explicit operational-or-higher consent state. Product and marketing purposes require their corresponding consent. Revoking consent stops future optional events; events are never replayed later.

## Connected vendors (v1.8.0)

Vercel Web Analytics and Speed Insights are mounted in  and are **gated by the same consent value** as the on-device recorder:

| Vendor | Purpose | Minimum consent |
| --- | --- | --- |
| Vercel Speed Insights (Core Web Vitals) | operational |  |
| Vercel Web Analytics (page views) | product |  |

 mounts neither component, so no request is made. Both are wrapped by owned facades (, ) per the package-ownership rule, and neither receives event properties from this module — they collect their own anonymous page-level data. Coverage: .

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
