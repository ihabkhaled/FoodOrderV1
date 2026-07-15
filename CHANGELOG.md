# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com) and Semantic Versioning.
The version bump level is decided by prompt density — see [rules/versioning.md](rules/versioning.md).

<!-- releases -->

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
