---
id: MEM-DECISIONS
title: Standing Decisions
type: guide
authority: canonical
status: active
owner: architecture-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Standing Decisions for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-13
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Standing decisions

Capacitor is the mobile shell, Firestore is the cloud store, localStorage is the explicit fallback, order lines are snapshots, domain functions are storage-independent, and English/Arabic are first-class supported locales. Marketplace, payment, and delivery concepts require future decisions rather than implicit expansion.

## Platform floors (2026-07-13)

- **Node.js >= 26** (`engines`, `.nvmrc`, CI). 26 is the current line (Active LTS Oct 2027); declared as the supported floor, advisory locally so Node 24 LTS still runs the gates.
- **Android minSdk 29 (Android 10)**, target/compile 36 (Android 16). Android 9 and older are unsupported.
- **iOS deployment target 14.0** — Capacitor 8's minimum. iOS 13 was requested but is not supported by Capacitor 8; supporting it would require a Capacitor 6 downgrade, which is rejected to stay current. See `docs/operations/platform-support.md`.

## Versioning (2026-07-13)

SemVer with a single place-of-record (`package.json`). **Bump level is chosen by prompt density**: localized change -> patch, new feature/flow -> minor, breaking schema/contract/architecture -> major (highest on a mix). Every release: bump via `tools/release/bump-version.mjs` (never hand-edit derived versions), changelog + release notes, annotated tag `vX.Y.Z`, GitHub release with APK + SHA-256 built from the tagged commit. See `rules/versioning.md` and `skills/versioning`.

## App shell (2026-07-13)

Responsive shell: persistent left sidebar at >=960px, slim top bar + bottom nav below. Toasts are bottom-anchored and must never overlap page content. One canonical owner per reusable component; layout is verified by the Playwright UI gate (`tests/e2e/ui.spec.ts`). The sidebar (and mobile top bar) carry instant, guest-capable language and theme switches and a persisted collapse toggle.

## Toolchain & quality (2026-07-13, cycle 2)

- Language target ES2024 (`tsconfig` + ESLint `ecmaVersion`); shipped bundle stays `es2022` (Vite `build.target`) for the iOS 14 / Android 10 WebViews.
- Dual TypeScript: **7.0.2 primary** (`typescript7` alias, typecheck+build) and **5.9.3** (real latest 5.x) for the lint toolchain, because typescript-eslint 8.x needs TS <6.1 and ESLint 9 (ESLint 10 unsupported). Documented in `audit/dependency-verification.md`.
- Dependencies kept latest-compatible: Vite 8, Vitest 4, Firebase 12.16, react-router 7.18, lucide 1.x, @capacitor 8.4. Clean install, **no `--legacy-peer-deps`**.
- ESLint = reference-repo 12-plugin parity (import-sort, unused-imports, jsx-a11y, promise, regexp, sonarjs, unicorn@60, security, prettier-config, vitest, testing-library, playwright), applied to every file; documented relaxations only.
- Git hooks: husky pre-commit (lint-staged), commit-msg (commitlint/Conventional Commits), pre-push (typecheck+tests). CI stays the source of truth.
- Quality tools: knip (dead code), madge (circular — none), trivy + npm audit. See `docs/operations/reference-parity-roadmap.md` for what's done vs. deferred (99%/file coverage, module architecture, v4 pack).
