---
id: ADR-0009
title: Separate reusable menu templates from live order sessions
type: adr
authority: canonical
status: accepted
owner: architecture-owner
audience: [engineer, qa, ai-agent, product]
lastVerified: 2026-07-18
generated: false
---

# ADR-0009: Separate reusable menu templates from live order sessions

## Context

Before v1.7.0 a shared `Bucket` represented both a reusable menu and the one mutable live collaboration state. It owned menu items, aggregate quantities, pricing, freeze/order state, and collaboration membership.

That shape made these product requirements unsafe or unnecessarily coupled:

- multiple independent orders from the same menu;
- recurring schedules;
- immutable historical prices;
- organizer deadlines and response readiness;
- settlement and receipt reconciliation;
- price/menu changes while an order is collecting;
- participant removal without mutating the reusable template.

A mutable menu must not be the authoritative financial snapshot for an already opened order.

## Decision

FoodOrderV1 introduces an explicit `OrderSession` aggregate.

A bucket remains the backward-compatible reusable menu template during v1.7.0. An order session snapshots:

- source bucket/menu ID and revision;
- bounded, stable menu item IDs;
- active state and custom-item source;
- integer minor-unit item prices;
- pricing policy;
- organizer, participant list, and response states;
- per-participant contributions and idempotency mutations;
- per-session materialized aggregate;
- lifecycle, deadline, scheduling, settlement, and audit state.

The source menu may change after session creation without changing the live session.

The session lifecycle is:

`draft -> collecting -> locked -> submitted -> confirmed -> delivered -> settling -> settled`

`cancelled` is an explicit terminal alternative. `locked -> collecting` is the only reopen path.

Participant response is explicit:

`pending | viewed | ordering | done | skipped | removed`

An empty contribution no longer means both “has not answered” and “is intentionally skipping.”

## Trust and persistence

- Local mode stores normalized session tables under the local database adapter.
- Firebase mode exposes authenticated V170 callables.
- Browser clients have no direct Firestore access to `orderSessions/**`.
- Lifecycle transitions are organizer-authoritative.
- Participants mutate only their own response and contribution.
- Collaborative writes require expected revisions.
- Contribution mutations are idempotent.
- Scheduled occurrence keys resolve to deterministic IDs to prevent duplicate runs.
- Trusted server code creates audit records.

## Money

All new session and settlement money is integer minor units. Legacy bucket prices are converted exactly once when creating the immutable session snapshot. Display conversion happens only at the presentation boundary.

## Compatibility

Existing v1.6 bucket and order records remain readable. v1.7 does not destructively rename deployed bucket collections. The product UI may present buckets as menus while adapters keep the persisted contract backward-compatible.

No existing order history is rewritten. New sessions are additive.

## Consequences

### Positive

- reusable menu and live order responsibilities are separated;
- multiple and recurring sessions become possible;
- historical price integrity is explicit;
- organizer readiness and settlement have one aggregate owner;
- concurrency conflicts are detected through revisions;
- cloud and local modes share one contract.

### Costs

- a session snapshot duplicates bounded menu data;
- session queries and indexes are new;
- v1.6 UI flows must coexist during the staged migration;
- callable/domain duplication must be controlled through contract tests and later shared-package evaluation.

## Rejected alternatives

### Continue resetting one bucket after every order

Rejected because simultaneous/repeated sessions, scheduling, and immutable financial history remain coupled.

### Store only a reference to current bucket items

Rejected because later menu edits could silently change a live or historical order.

### Let browser clients write session subcollections directly

Rejected because financial summaries, audit history, participant eligibility, and lifecycle state require a trusted boundary.

## Validation

- pure lifecycle, response, snapshot, contribution, and settlement tests;
- local service contract tests;
- Functions validation;
- Firestore denial emulator tests;
- multi-user cloud emulator E2E before release;
- backward-compatible v1.6 fixture tests.
