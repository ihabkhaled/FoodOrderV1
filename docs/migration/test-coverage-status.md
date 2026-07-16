# Test Coverage Status

## Current suites

- Unit/integration (Vitest, jsdom): 18 files / 88 tests + the architecture
  ESLint rule suite (54 cases) = 142 total. Coverage instruments the pure
  helper layers (`src/shared/helpers/**` at 100% enforced,
  `src/modules/data-access/helpers/**`) and the local persistence gateways,
  with ratchet thresholds in vitest.config.ts that may only move up.
- Firestore security rules: 4 suites under `tests/firebase/` (run against the
  emulator in CI).
- End-to-end (Playwright, chromium + mobile-chrome, local-mode adapter):
  7 specs covering registration→order smoke, responsive shell/theme/RTL,
  group-order lifecycle, critical group-order regressions, bucket pricing,
  social sharing, social management.

## Well covered

Domain helpers (bucket, bucketLifecycle, order, sharing, memberPermissions,
pagination, groupOrder engine, firebaseError), local persistence adapters,
group-order components, Firestore rules, all critical user journeys (e2e).

## Known gaps (tracked, not hidden)

- Pages/containers have no unit tests (covered by e2e journeys only).
- 21 of 25 legacy components lack unit tests; the migration preserves their
  behavior via the e2e suites and adds no regressions.
- Cloud gateway variants (Firestore/callable implementations) have no unit
  tests; they are exercised by Firestore-rules suites and the post-deploy
  callable smoke tests in CI.
- Coverage thresholds: pure layers (`shared/helpers`, module `helpers/`)
  target 100%; expanding instrumented scope beyond the pure/domain layer is
  deferred (see unresolved-exceptions.md).
