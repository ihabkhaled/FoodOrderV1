---
id: ADR-0011
title: Server-authoritative subscription plans and entitlements
type: adr
authority: canonical
status: accepted
owner: architecture-owner
audience: [engineer, qa, ai-agent, product, security]
lastVerified: 2026-07-18
generated: false
---

# ADR-0011: Server-authoritative subscription plans and entitlements

## Context

v1.7.0 introduces monetization readiness for organizer automation and business workspaces. UI-only plan checks are insufficient: a modified client could forge plan state or call paid server operations directly. Provider-specific billing logic in product modules would also couple the domain to merchant credentials that may not be available in every environment.

Participant order settlement and FoodOrder SaaS subscription billing are separate domains and must not share payment-state semantics.

## Decision

Create a `billing` module that owns:

- stable Free, Organizer Pro, and Business Workspace plan identifiers;
- typed entitlements and usage meters;
- subscription lifecycle states;
- one plan catalog;
- effective-plan resolution;
- immutable entitlement snapshots;
- deterministic entitlement and usage-limit evaluation;
- provider-neutral contracts for later checkout, portal, and webhooks.

Paid server capabilities must evaluate a trusted server projection. A plan field from a browser request is ignored.

## Plans

### Free

Core group ordering with bounded active sessions, menus, history, and storage.

### Organizer Pro

Recurring sessions, automated reminders, payment tracking/proof, receipt reconciliation, advanced exports, and extended history.

### Business Workspace

All organizer capabilities plus workspaces, administration, cost centers, spending policy, member scale, and branding.

Limits are centralized meter values. `null` means unlimited. Existing data remains accessible after trial or subscription expiry; only future paid actions are gated.

## Subscription states

Paid access remains effective for:

- trialing;
- active;
- grace;
- cancel at period end.

Inactive, past-due after policy exhaustion, and cancelled records fall back to Free policy. Exact provider policy may refine state transitions at the trusted webhook boundary.

## Provider boundary

A production provider must implement:

- checkout creation;
- customer portal;
- signed webhook verification;
- idempotent provider-event processing;
- out-of-order event resolution;
- private customer/subscription references;
- safe disabled/unconfigured behavior;
- audit history;
- redacted logs.

A deterministic fake provider is permitted only in local mode/tests.

## Consequences

### Positive

- paid capabilities have one policy source;
- UI and server can explain the same decision;
- provider selection remains replaceable;
- plan limits are testable;
- unconfigured billing is honest and safe;
- participant settlement remains independent.

### Costs

- each paid callable must perform entitlement evaluation;
- usage counters require trusted, idempotent updates;
- production checkout cannot be claimed before merchant credentials and webhooks are verified.

## Rejected alternatives

### Boolean `isPro` in the user profile

Rejected because it is too coarse, difficult to migrate, and unsafe if client-writable.

### Scattered plan checks in components

Rejected because policy would drift and server calls would remain unprotected.

### Use participant payment status for SaaS billing

Rejected because the actors, provider lifecycle, privacy, and accounting semantics differ.

## Validation

- exhaustive plan/status/limit evaluation tests;
- trusted subscription persistence and rules tests;
- duplicate/out-of-order webhook tests;
- paid callable denial and success tests;
- unconfigured provider UI and local fixtures;
- conversion telemetry with consent.
