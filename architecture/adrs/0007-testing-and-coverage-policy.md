# ADR-0007: Testing and coverage policy

- Status: Accepted
- Date: 2026-07-16

## Context

Pre-migration reality: 79 unit/integration tests in 16 files concentrate on the pure
domain layer and local adapters; pages and 21 of 25 components have no unit tests; instead,
7 Playwright journeys (chromium + mobile-chrome, always local mode) cover every critical
user flow, and 4 Firestore emulator suites cover the rules. A blanket "95% global
coverage" mandate would force screen-level unit suites for every page — a large,
regression-prone effort orthogonal to a behavior-preserving migration.

## Decision

**E2E-first for screens; 100% for pure layers.** Recorded as **EXC-3**:

- Screens (containers + screen components) are covered by Playwright journeys — extending
  the owning spec is the required evidence for screen changes. No screen unit suites
  during the migration.
- Pure layers (`src/shared/helpers`, module `helpers/`, domain logic in `data-access`)
  target 100% coverage; the Vitest instrumentation scope follows these layers
  (`vitest.config.ts` include list) and grows with the migration.
- Rules changes require emulator allow/deny suites; cloud gateway behavior is evidenced by
  rules suites + CI deployed-callable smoke tests (an honest, documented gap in unit
  coverage — `docs/migration/test-coverage-status.md`).
- Every migrated module keeps its existing tests green; the e2e suites gate every PR
  (`e2e` + `critical-e2e` CI jobs).

## Consequences

- Refactoring safety comes from journeys (integration truth) + exhaustive pure-layer
  tests (logic truth) — cheap where tests are cheap, realistic where realism matters.
- Screen-level defects that journeys don't traverse can slip; mitigated by extending
  journeys with each feature change rather than accumulating a unit-test debt mid-migration.
- **Removal condition (binding)**: screen-level unit suites are added module by module
  post-1.6.0, raising instrumented global coverage toward 95%.

## Enforcement

CI `coverage`, `e2e`, `critical-e2e`, `firestore-rules` jobs; `forbidOnly` +
vitest/playwright lint plugins; testing-reviewer checklist; EXC-3 documents scope + owner.
