# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com) and Semantic Versioning.
The version bump level is decided by prompt density — see [rules/versioning.md](rules/versioning.md).

<!-- releases -->

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
