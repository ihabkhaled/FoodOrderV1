# 16 — Testing and coverage

## Rule

Every change carries direct evidence at the right level: unit tests for pure logic
(target 100% on pure layers), Vitest + Testing Library for shared/self-contained UI,
Playwright journeys for screens (e2e-first, per
[../architecture/adrs/0007-testing-and-coverage-policy.md](../architecture/adrs/0007-testing-and-coverage-policy.md)),
Firestore emulator suites for rules, and CI callable smoke tests for deployed functions.
Coverage scope is governed by EXC-3.

## Motivation

The suite pyramid matches where bugs actually live here: money math, status machines, and
permission logic are pure functions (cheap, exhaustive unit tests); screens are thin wiring
over them (journeys catch integration breaks); security lives in rules (emulator proof).

## Required

- Test map (real, current):
  - Unit/integration: `tests/domain/*` (bucket, bucketLifecycle, order, sharing,
    memberPermissions, pagination, groupOrder, firebaseError), `tests/services/*` (local
    gateways), `tests/components/*`, root `tests/bucket-pricing.test.ts`,
    `tests/order-repeat.test.ts` — run `npm run test`.
  - ESLint architecture rules: `tests/eslint/architecture-plugin.test.ts` (RuleTester).
  - Rules: `tests/firebase/*.rules.test.ts` — `npm run test:rules` (emulator).
  - E2E (always `VITE_FORCE_LOCAL_MODE=true`, chromium + mobile-chrome):
    `tests/e2e/{smoke,ui,group-order,order-lifecycle,bucket-pricing,social-sharing,social-management}.spec.ts`
    — `npm run test:e2e`; critical subset `npm run test:e2e:critical`.
- New pure logic (helpers, domain, enums-adjacent mapping) gets unit tests targeting 100%.
- New/changed screen behavior gets an e2e assertion in the owning journey spec.
- Migrated code moves its tests with it; suites stay green at every migration step.
- Determinism: no sleeps in unit tests; Playwright uses web-first assertions and the
  configured retries only.

## Forbidden

- `.only` / `.skip` committed (`@vitest/eslint-plugin`, `eslint-plugin-playwright` catch
  these; `forbidOnly` in CI).
- Weakening or deleting assertions to pass; testing implementation details (query by role/
  label, not class names — Testing Library lint enforces this).
- E2E against live Firebase; live-mode coverage claims (cloud gateways are covered by rules
  suites + CI callable smoke tests, honestly recorded in
  [../docs/migration/test-coverage-status.md](../docs/migration/test-coverage-status.md)).
- Raising or gaming coverage by instrumenting trivial files instead of testing behavior.

## Enforcement

- CI jobs: `coverage`, `e2e`, `critical-e2e`, `firestore-rules`, `functions`; husky
  pre-push runs typecheck + test.

## Definition of done

Targeted suites pass locally, the right level of new evidence exists, coverage on touched
pure files is 100%, and `docs/migration/test-coverage-status.md` reflects any posture change.
