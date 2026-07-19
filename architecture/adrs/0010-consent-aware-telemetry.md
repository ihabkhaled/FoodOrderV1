---
id: ADR-0010
title: Consent-aware typed telemetry with PII rejection
type: adr
authority: canonical
status: accepted
owner: architecture-owner
audience: [engineer, qa, ai-agent, product, security]
lastVerified: 2026-07-18
generated: false
---

# ADR-0010: Consent-aware typed telemetry with PII rejection

## Context

FoodOrderV1 had strong code-quality evidence but no production-grade product analytics, funnel visibility, reliability taxonomy, or feature-exposure contract. Adding vendor SDK calls directly to feature hooks would create inconsistent event names, accidental personal-data leakage, and a hard-to-replace vendor dependency.

The product handles member identity, order choices, notes, invitation secrets, receipts, and payment proof. Those values must never become analytics properties.

## Decision

Create a dedicated `telemetry` feature module that owns:

- typed event names and event-specific property contracts;
- operational, product, and marketing purposes;
- runtime consent levels;
- safe application context;
- PII/free-text rejection;
- reliability error categories;
- performance-measure identifiers;
- analytics, error-reporting, and performance adapter interfaces;
- deterministic local/test recording;
- failure isolation so telemetry cannot break ordering.

Feature code may emit only events from the typed registry. Vendor SDKs require a single package-owner facade and adapter.

## Consent model

- `denied`: no optional telemetry;
- `operational_only`: privacy-safe reliability and performance events;
- `product_analytics`: operational plus acquisition, activation, and feature usage;
- `product_and_marketing`: also upgrade and subscription-funnel events.

Consent persists through the platform storage boundary and is editable in Settings. Revocation stops future optional events; no later replay occurs.

## Privacy rules

Telemetry rejects:

- email, phone, full/display name, address;
- invitation tokens and passwords;
- notes, messages, and free-form private text;
- attachment URLs/paths and payment proof/reference;
- raw error payloads;
- nested arbitrary objects;
- URLs and email-looking string values;
- non-finite numbers and oversized strings.

Only bounded primitive properties with documented business purpose are accepted.

## Event registry

The canonical registry covers:

- acquisition and guest/auth funnel;
- activation milestones;
- engagement and recurrence;
- organizer productivity;
- settlement and reconciliation;
- plan and entitlement funnel;
- reliability failures;
- feature-flag exposure.

The north-star metric is weekly settled group-order sessions with at least two participants.

## Consequences

### Positive

- privacy enforcement is centralized and testable;
- event names and properties cannot drift silently;
- vendor replacement is bounded;
- local mode and tests capture deterministic events;
- telemetry outage cannot block an order;
- consent is visible product behavior.

### Costs

- feature instrumentation requires registry work first;
- product dashboards remain an operational deliverable outside application source;
- vendor configuration and retention policy must be documented separately.

## Rejected alternatives

### Direct Firebase Analytics imports in hooks

Rejected due to package ownership, consent, vendor coupling, and inconsistent PII review.

### Log arbitrary dictionaries and clean them downstream

Rejected because sensitive data must be prevented before transmission.

### Treat all diagnostics as mandatory

Rejected because the product requires explicit, understandable consent behavior.

## Validation

- purpose/consent matrix tests;
- forbidden-key/value tests;
- adapter-failure tests;
- Settings accessibility/component tests;
- event taxonomy documentation;
- production vendor redaction and unconfigured-state tests before enabling transmission.
