# Test Coverage Status

## Current suites

- Unit/integration (Vitest, jsdom): 20 files / 94 tests + the architecture
  ESLint rule suite (54 cases) = 148 total. Coverage instruments the pure
  helper layers (`src/shared/helpers/**` at 100% enforced),
  `src/modules/data-access/helpers/**`, and the local auth/data/database/
  notification/sharing gateways, with ratchet thresholds in `vitest.config.ts`
  that may only move up.
- Firestore security rules: 4 suites under `tests/firebase/` (run against the
  emulator in CI).
- End-to-end (Playwright, deterministic local-mode adapter): 10 specs covering
  registration→order smoke, responsive shell/theme/RTL, group-order lifecycle,
  critical group-order regressions, bucket pricing, social sharing, social
  management, long-list navigation, fixed overlays, touch targets, loading/UI
  polish, portrait, landscape, tablet, and desktop layout behavior.
- Primary E2E gate: Chromium desktop, Pixel 7 Chrome, and iPad Mini Chromium.
- Cross-browser E2E workflow: desktop Firefox, desktop WebKit, and iPhone 15 Pro
  Safari. `npm run test:e2e:all` executes the complete six-project matrix.

## Well covered

Domain helpers (bucket, bucketLifecycle, order, sharing, memberPermissions,
pagination, groupOrder engine, firebaseError), local auth/data/notification/
sharing persistence adapters, shared loading and confirmation UI, group-order
components, Firestore rules, and all critical user journeys.

Responsive regressions now explicitly cover long copy, group title/member-count
separation, action visibility, minimum touch targets, fixed notification panels,
collapsed and expanded navigation, mobile portrait/landscape, tablet, desktop,
RTL-safe logical positioning, and horizontal overflow.

## Known gaps (tracked, not hidden)

- Pages/containers have no unit tests (covered by e2e journeys only).
- Most migrated feature components remain journey-tested rather than directly
  unit-tested; shared/self-contained components receive Testing Library coverage
  as they change.
- Cloud gateway variants (Firestore/callable implementations) have no unit
  tests; they are exercised by Firestore-rules suites and the post-deploy
  callable smoke tests in CI.
- Coverage thresholds: pure layers (`shared/helpers`, module `helpers/`)
  target 100%; expanding instrumented scope across every feature component and
  cloud adapter remains deferred (see unresolved-exceptions.md).
- iOS native-shell compilation and entitlement validation still require macOS;
  mobile Safari Playwright validates web/PWA rendering, not the committed iOS
  project or App Store signing.
