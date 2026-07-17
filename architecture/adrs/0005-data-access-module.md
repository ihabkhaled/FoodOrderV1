# ADR-0005: The data-access module

- Status: Accepted
- Date: 2026-07-16

## Context

Pure module-first doctrine says each feature module owns its own persistence gateways. But
this app's persistence is a single `DataService` contract (profile + buckets + orders +
dashboard) implemented by two cohesive dual-backend classes — Firestore and local-device —
that share one storage schema and helper set (~1,600 lines across
`firebaseServices.ts`/`localServices.ts` plus the group-order, social, notification,
pagination, and lifecycle service pairs). The tests characterize this logic only partially
(local adapters have unit suites; cloud variants are covered by rules tests and callable
smoke tests, not unit tests). The migration's prime directive is behavior preservation:
**do not rewrite working business logic without tests.**

## Decision

Cross-feature persistence lives in ONE module, `src/modules/data-access`: persisted domain
model types, interface-typed service contracts, both gateway families, and storage-mode
selection. Feature modules depend on it one-way through its public surface. This is
recorded as **EXC-1** in `docs/migration/unresolved-exceptions.md`.

WHY one module instead of per-feature gateways: splitting the dual-backend classes
per-feature would be a rewrite of partially characterized persistence logic — exactly what
the migration rules forbid. The cohesion is real (shared schema, shared helpers, one
mode-selection point), so the honest boundary is around the whole, not through it.

## Consequences

- `data-access` is the largest module and a hotspot; mitigated by one-gateway-per-file
  splits (in place, before moving) and interface-per-service contracts.
- Feature modules stay persistence-free; swapping/splitting backends later has one seam.
- **Removal condition (binding)**: when per-feature characterization tests exist for the
  persistence layer, split the gateway classes per module. Until then, no rewrite.
- Storage-mode selection (cloud vs local from `VITE_FORCE_LOCAL_MODE`/`VITE_FIREBASE_*`)
  has exactly one home.

## Enforcement

Module surface rules keep internals private; layer matrix keeps the dependency one-way;
EXC-1 documents owner and removal condition; `skills/create-service-or-gateway.md` binds
new work to the pattern; reviews block characterization-free rewrites (rule 33).
