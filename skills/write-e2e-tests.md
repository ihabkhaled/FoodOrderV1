# Skill: write e2e tests

## Required reading

[../rules/16-testing-and-coverage.md](../rules/16-testing-and-coverage.md),
`playwright.config.ts`, and the closest existing journey in `tests/e2e/`
(smoke, ui, group-order, order-lifecycle, bucket-pricing, social-sharing,
social-management).

## Preconditions

- The flow is user-visible screen behavior (screens are e2e-first here — EXC-3).
- The behavior works in local-device mode: the webServer forces
  `VITE_FORCE_LOCAL_MODE=true`; live Firebase is never touched by e2e.
- Decide: extend an existing journey (preferred for the same flow) vs a new spec (new
  user journey).

## Steps

1. Add to the owning spec or create `tests/e2e/<journey>.spec.ts` (`.spec` suffix — `.test`
   files are unit suites with different lint).
2. Drive the real flow from registration/login onward like a user: navigate by clicking,
   fill forms, assert visible outcomes. Query by role/label/text (bilingual-stable
   selectors; prefer roles over copy where copy may localize).
3. Use web-first assertions (`await expect(locator).toBeVisible()`); no manual waits.
   `actionTimeout` is 15s; retries are configured (1 local / 2 CI) — do not add more.
4. Keep the spec independent: it must pass alone and in full parallel
   (`fullyParallel: true`), on BOTH projects (chromium desktop + mobile-chrome Pixel 7 —
   watch responsive/touch differences).
5. If the flow is release-critical (group orders, order lifecycle, pricing), consider
   whether it belongs in the `test:e2e:critical` set (script change = orchestrator/owner
   decision, flag it in the PR).

## Forbidden shortcuts

- `test.only` (CI `forbidOnly`), arbitrary `waitForTimeout`, retry-until-green flakes.
- Seeding state by writing localStorage directly instead of driving the UI (existing
  journeys build state through the UI).
- Desktop-only assertions that break mobile-chrome.
- Marking a flake as passed: diagnose (trace is on first retry) or fix the test.

## Required tests

The new/changed assertions themselves, passing on both projects, twice in a row locally.

## Validation

```bash
npm run test:e2e                                  # full, both projects
npx playwright test tests/e2e/<journey>.spec.ts   # focused
npm run test:e2e:critical                         # if a critical spec changed
npm run lint                                      # playwright plugin checks spec code
```

## Definition of done

Journey green on chromium AND mobile-chrome, deterministic, independent, asserting user
outcomes (not implementation), and `docs/migration/test-coverage-status.md` updated when
the journey map changed.
