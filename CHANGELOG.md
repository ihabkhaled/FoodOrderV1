# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com) and Semantic Versioning.
The version bump level is decided by prompt density — see [rules/versioning.md](rules/versioning.md).

<!-- releases -->

## [1.10.0] - 2026-08-26

- Added shareable invite links for menus, friendships, and groups: multi-use,
  revocable, idempotent, and redeemed only by callables holding admin rights.
- Carried the attempted destination through login and signup, so an invite
  opened while signed out resumes afterwards.
- Put Home, About, and Contact in the mobile bottom bar and made it scroll
  rather than shrink targets below the minimum touch size.
- Added five step-by-step guides in all thirteen languages, taking the public
  site from 130 to 195 localized documents and English body content from about
  1,521 to 5,350 words.
- Added sign-in and sign-up links to the public header, a globe on the language
  menu, and a borderless theme toggle.
- Replaced the boot screen's skeleton bars with a plain rotating loader and
  reserved skeletons for lists and cards.

## [1.10.0] - 2026-08-26

- Start v1.10.0 development


## [1.9.2] - 2026-08-16

- Active-order spacing polish, pressable dashboard journey, local quantity loading, and participant response navigation.
- Stopped treating the repo-root `package.json`/`package-lock.json` as function
  deploy triggers — functions never import the root package, and the root
  manifest changes on nearly every release, so releases with no function
  changes were running 30-minute full deploys that failed on CPU quota.
  `packages/group-order-engine/**` (compiled into the bundle) now triggers
  correctly instead.
- Derived surgical deploy targets from the source files; the hand-kept list had
  drifted and would have skipped `inviteFriendToGroup` on a `social.ts` deploy.
- Halved standing Cloud Run CPU reservation (`maxInstances: 1`) so rollouts have
  quota headroom, and raised the deploy batch size to 8 accordingly.


## [1.9.1] - 2026-08-15

- Guided ordering, warmer UI themes, natural Egyptian Franco, recent-item autocomplete, and selective Firebase releases.


## [1.9.0] - 2026-08-13

- Start v1.9.0 development


## [1.8.1] - 2026-08-08

- Upgraded Firebase, Firebase Tools, Playwright, jsdom, Node.js types, fast-uri,
  ip-address, Undici, and the setup-node, setup-java, download-artifact, and
  setup-android GitHub Actions without dependency downgrades.
- Repaired agent task routing, whose path table still described the pre-v1.6.0
  layout: seven of twelve paths matched nothing, so most tasks fell back to a
  generic scope. Domains are now derived from `src/modules/*`, and `ai:doctor`
  plus a tooling test fail when one stops resolving.
- Replaced the context command's list of files to read with a compiled bundle
  (`.ai/context/current.md`) carrying rule obligations, exported symbols,
  covering tests, and a risk-scaled validation lane — a measured 93–97% fewer
  tokens than reading the same sources, cached against the tree state.
- Added `test:ai`, `lint:ai`, `typecheck:ai`, and `build:ai`, which print one
  line on success and only the failing lines otherwise, plus `.aiignore`.


## [1.8.0] - 2026-07-29

- Start v1.8.0 development
- Reused buckets as order templates: "Start round" opens an order session from a
  shared bucket, seeds its members, and notifies them.
- Removed the "(copy)" suffix when duplicating a bucket.
- Rendered zero as a placeholder in money and percentage fields.
- Confirmed logout with a busy dialog and reset the stale profile guard.
- Required email and password re-entry before account deletion.
- Split settings into a hub with preferences, privacy, security, and account.
- Restored language and theme from the profile on a new device and tracked live
  system theme changes.
- Gave analytics consent a real device-local diagnostics sink with a visible
  count, a clear action, and a roaming profile field.
- Loaded each screen section by section with per-section placeholders.
- Mirrored in-app notifications into the OS tray with permission prompts and
  tap-to-open routing.
- Introduced guided tours on all twenty-four screens (138 steps) with a replay
  control in preferences.
- Added Arabic Franco as a thirteenth language across the app and the public site.
- Split the friends area into a hub with friends, requests, and groups pages, and
  bucket sharing into members and activity pages.
- Added a light/dark switch to the public site and reduced its header to one row
  with the destinations in a collapsible menu.
- Counted build numbers per version from existing release tags, so a version bump
  restarts them at zero instead of carrying a repository-wide run number.
- Published the version's release notes as the body of every release and
  prerelease, and as the pull request description, instead of a generated
  sentence.
- Delivered remote push through Firebase Cloud Messaging, with device tokens
  removed on sign-out.
- Gave shared application links a preview card with the title, description, and
  logo; previously only the marketing pages had one and `/app` shared bare.
- Allowed same-version hotfix PRs from `fix/*`/`hotfix/*` branches; they ship as
  a new build number of the current version instead of demanding a bump.
- Ran the nine Firestore notification triggers with a single instance to bring
  reserved regional CPU back under quota; deploys were failing container health
  checks. Treated quota-starved HTTP 500 like 503 in the callable smoke test.


## [1.7.4] - 2026-07-26

- Start v1.7.4 development
- Kept 43 Firebase Functions below the regional CPU ceiling with `maxInstances: 2`.
- Retried transient 429/503 callable smoke responses with bounded backoff.


## [1.7.3] - 2026-07-26

- Start v1.7.3 development
- Fixed the cross-project dashboard contrast test and added strict current-commit primary and cross-browser merge gates.
- Patched React Router and removed the temporary EXC-6 audit/Trivy exception.
- Updated compatible runtime, build, testing, and browser dependencies.
- Added mandatory post-merge GitHub releases composed from canonical and merged-PR notes.


## [1.7.2] - 2026-07-26

- Start v1.7.2 development


## [1.7.1] - 2026-07-22

- Start v1.7.1 development


## [1.7.0] - 2026-07-18

- Begin the high-impact v1.7.0 product release covering order sessions, organizer productivity, secure guest activation, settlement, monetization readiness, analytics, observability, and a complete responsive UX quality pass.
- Add target-version branch governance and green-build prerelease APK automation so every validated branch or main push produces an immutable versioned artifact without CI writing commits back to the repository.
- Preserve v1.6.x compatibility through additive schemas, migrations, characterization tests, and release-blocking security and quality evidence.

## [1.6.0] - 2026-07-16

- Module-first architecture migration: layered src structure (app/modules/shared/platform/packages), architecture ESLint enforcement, package ownership, and governance documentation.
- Upgrade the shared design system with richer cards, buttons, navigation, forms, loaders, spacing, responsive portrait/landscape behavior, and reduced-motion fallbacks.
- Fix friend-group title/member-count separation and preserve edit/delete controls across mobile, tablet, desktop, RTL-safe, and short-height layouts.
- Expand Playwright to Chromium desktop/mobile/tablet plus Firefox, WebKit, and mobile Safari, with additional UX, overlay, touch-target, unit, and local-notification integration coverage.

## [1.5.1] - 2026-07-16

- Fix invitation notifications, responsive layouts, scrolling, and navigation

## [1.5.0] - 2026-07-16

- Add friend removal, duplicate-safe group invitations, owner group editing and deletion, member removal and leaving, an enhanced friends/groups interface, and trusted navbar notifications for social, bucket, and order activity.

## [1.3.4] - 2026-07-15

- Move VAT, service, and delivery configuration into bucket creation/editing, preserve it when duplicating buckets, and apply it to private single-person orders.

## [1.2.0] - 2026-07-13

- Sidebar language/dark-mode/collapse controls, latest toolchain (Vite 8, Vitest 4, ES2024), and full ESLint + git-hook + CI quality parity

## [1.1.1] - 2026-07-13

- Stop shipping sourcemaps in the production/native bundle (smaller APK, no source on device)

## [1.1.0] - 2026-07-13

- Responsive UI overhaul, prompt-density versioning, and raised platform floors (Node 26, Android 10, iOS 14)

## [1.0.0] - 2026-07-13

- First full release of the Capacitor rebuild: private buckets & orders, collaborative bucket
  sharing (roles, join-code invites, concurrency-safe contributions, group orders), runtime
  locale/currency/theme, data export & account deletion, committed Android/iOS platforms, and an
  Android debug APK. Schema v2 Firestore Security Rules and TypeScript 7.0.2 primary compiler.
