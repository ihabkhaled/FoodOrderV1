# 06 — Services and gateways

## Rule

Persistence and integration behavior lives behind interface-typed service contracts in
`src/modules/data-access`. Every contract has two gateway implementations — cloud
(Firestore/callables via `@/packages/firebase`) and local-device (storage via
`src/platform/storage`) — selected once at startup by storage-mode selection reading
`src/platform/environment`.

## Motivation

The dual-backend design is a shipped product feature (local mode is fully functional, and
e2e always runs against it). Keeping both implementations behind one contract in one module
(EXC-1) preserves ~1,600 lines of working, partially characterized persistence logic
without a rewrite.

## Required

- One gateway class per file: `*.gateway.ts` (persistence backends), `*.service.ts`
  (contract-level orchestration), `*.adapter.ts` (vendor-shape adapters).
- Contracts are TypeScript interfaces in `*.interfaces.ts`; consumers depend on the
  interface, never a concrete gateway class.
- Firestore transactions own contribution writes; contribution mutations carry unique
  mutation ids and replay-safe semantics (see `.ai/BOOTSTRAP.md` invariants).
- Cloud gateways import Firebase only via `@/packages/firebase`; local gateways touch
  storage only via `src/platform/storage`.
- Errors are normalized before leaving the service layer
  ([12-error-handling.md](12-error-handling.md)).

## Forbidden

- React imports anywhere in services/gateways (layering makes this structural).
- UI code importing a gateway class directly — access is contract-through-hook.
- `localStorage` / `window` access inside gateways (the legacy local services did this;
  the migration routes it through `src/platform`).
- Splitting or rewriting the dual-backend gateway classes without characterization tests
  (EXC-1 removal condition; rule 33 of
  [00-non-negotiable-rules.md](00-non-negotiable-rules.md)).
- Divergent behavior between cloud and local implementations of the same contract method.

## Enforcement

- `architecture/no-raw-package-imports`, `architecture/no-browser-globals-outside-platform`,
  `architecture/no-restricted-layer-imports`, `architecture/enforce-file-suffixes`.
- Local gateways: unit tests in `tests/services/`; cloud gateways: Firestore rules suites
  (`npm run test:rules`) + deployed-callable smoke tests in CI.

## Definition of done

Both implementations satisfy the contract and its tests; local-mode e2e journeys pass
(`npm run test:e2e`); rules tests pass when Firestore paths changed; no vendor import leaks
outside `src/packages/firebase`.
