# Test strategy map

Rule: [../rules/16-testing-and-coverage.md](../rules/16-testing-and-coverage.md); policy:
[../architecture/adrs/0007-testing-and-coverage-policy.md](../architecture/adrs/0007-testing-and-coverage-policy.md);
live posture: [../docs/migration/test-coverage-status.md](../docs/migration/test-coverage-status.md).

## Level → subject → location → command

| Level                                                         | Covers                                                                                                                                             | Location                                   | Command                      |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------- |
| Unit (Vitest, jsdom)                                          | Domain helpers: bucket, bucketLifecycle, order, sharing, memberPermissions, pagination, groupOrder, firebaseError                                  | `tests/domain/`                            | `npm run test`               |
| Unit/integration                                              | Local gateways (localServices, groupOrderServices, paginationServices, sharing)                                                                    | `tests/services/`                          | `npm run test`               |
| Component (Testing Library)                                   | Shared/self-contained UI (ConfirmDialog, group-order components)                                                                                   | `tests/components/`                        | `npm run test`               |
| Cross-cutting unit                                            | Pricing, order repeat                                                                                                                              | `tests/` root `*.test.ts`                  | `npm run test`               |
| ESLint rules (RuleTester)                                     | All 9 architecture rules (valid/invalid fixtures)                                                                                                  | `tests/eslint/architecture-plugin.test.ts` | `npm run test`               |
| Firestore rules (emulator)                                    | firestore, notifications, personal-pricing, social rules                                                                                           | `tests/firebase/*.rules.test.ts`           | `npm run test:rules`         |
| E2E (Playwright, chromium + mobile-chrome, ALWAYS local mode) | 7 journeys: smoke (registration→order), ui (responsive/theme/RTL), group-order, order-lifecycle, bucket-pricing, social-sharing, social-management | `tests/e2e/*.spec.ts`                      | `npm run test:e2e`           |
| Critical e2e subset                                           | group-order, order-lifecycle, bucket-pricing                                                                                                       | same                                       | `npm run test:e2e:critical`  |
| Functions                                                     | notification/order/social domain logic                                                                                                             | `functions/test/*.test.mjs`                | `npm run functions:validate` |
| Deployed-callable smoke                                       | UNAUTHENTICATED boundary of the 5 live callables                                                                                                   | CI `firebase-deploy` job                   | CI only                      |

## Decision rules

- Pure logic (helpers, domain, mappers) → unit, 100% coverage target.
- Screens/containers → e2e-first (EXC-3): extend the owning journey; no unit suites for
  screens during the migration.
- Cloud gateway behavior → rules suites + callable smoke (honest gap: no unit tests;
  recorded in test-coverage-status.md).
- Rules changes → emulator allow AND deny cases, always.
- Coverage instrumentation currently scopes to the pure/local-adapter layer
  (`vitest.config.ts` include list follows the migration).

## Non-negotiables

No `.only`/`.skip` committed; deterministic suites; e2e green on both projects; migrated
code moves with its tests; flakes diagnosed via trace, never retried into green.
