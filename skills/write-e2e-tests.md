# Skill: write e2e tests

## Required reading

[../rules/16-testing-and-coverage.md](../rules/16-testing-and-coverage.md),
`playwright.config.ts`, and the closest existing journey in `tests/e2e/`
(smoke, ui, group-order, order-lifecycle, bucket-pricing, social-sharing,
social-management, responsive-navigation, responsive-overlays, ux-polish).

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
4. Keep the spec independent: it must pass alone and in full parallel. Primary validation
   covers desktop Chromium, Pixel 7 Chrome, and iPad Mini Chromium. Cross-browser validation
   additionally covers desktop Firefox, desktop WebKit, and iPhone 15 Pro Safari.
5. For responsive work, verify portrait, landscape, tablet, desktop, long-copy, RTL, dark
   theme, touch-target sizing, fixed overlays, and horizontal overflow where relevant.
6. If the flow is release-critical (group orders, order lifecycle, pricing), consider
   whether it belongs in the `test:e2e:critical` set (script change = orchestrator/owner
   decision, flag it in the PR).

## Forbidden shortcuts

- `test.only` (CI `forbidOnly`), arbitrary `waitForTimeout`, retry-until-green flakes.
- Seeding state by writing localStorage directly instead of driving the UI, unless extending
  an existing explicitly documented responsive fixture whose purpose is large deterministic
  layout data.
- Chromium-only assumptions that break Firefox, WebKit, tablet, or mobile Safari.
- Marking a flake as passed: diagnose (trace is on first retry) or fix the test.

## Required tests

The new/changed assertions themselves, passing on all affected primary and cross-browser
projects, twice in a row locally when the environment can install those browsers.

## Validation

```bash
npm run test:e2e                                  # Chromium desktop/mobile/tablet
npm run test:e2e:cross-browser                    # Firefox, WebKit, mobile Safari
npm run test:e2e:all                              # complete six-project matrix
npx playwright test tests/e2e/<journey>.spec.ts   # focused across configured projects
npm run test:e2e:critical                         # if a critical spec changed
npm run lint                                      # playwright plugin checks spec code
```

## Definition of done

Journey green on every affected configured project, deterministic, independent, asserting
user outcomes rather than implementation details, and
`docs/migration/test-coverage-status.md` updated when the journey or project map changes.
