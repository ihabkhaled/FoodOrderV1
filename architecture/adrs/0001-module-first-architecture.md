# ADR-0001: Module-first architecture

- Status: Accepted
- Date: 2026-07-16

## Context

The pre-1.6.0 tree grouped files by kind (`src/pages`, `src/components`, `src/services`,
`src/state`, `src/lib`, `src/hooks`, `src/config`, `src/i18n`, `src/types`). At 83 files /
~13,000 lines, feature changes fanned across up to 9 directories, files grew
multi-responsibility (`firebaseServices.ts` at 827 lines, `SocialPage.tsx` at 674), and no
boundary was mechanically checkable — the violation inventory found 196 out-of-place hook
calls, 60+ files with raw vendor imports, and browser globals in 14 files.

## Decision

Adopt a layered module-first layout: `src/app` (composition) → `src/modules/*` (features:
auth, buckets, group-orders, orders, social, notifications, dashboard, settings, plus
session and data-access) → `src/shared` + `src/platform` → `src/packages` (vendor facades).
Public surfaces are module `index.ts` files (`@/modules/<name>`, `@/packages/<name>`).
Enforcement is a project-owned ESLint plugin (9 rules, error severity) landed BEFORE
migration, so the new tree only ever contains compliant code. Migration is
behavior-preserving, file-by-file, tracked in `docs/migration/`.

## Consequences

- Feature work is localized to one module; reviewers check placement mechanically.
- Migration cost is real but bounded by the inventory; legacy directories die
  incrementally, and lint scope grows to full coverage as they do.
- Two deliberate deviations were accepted rather than forced: cross-feature persistence
  cohesion (EXC-1, [0005](0005-data-access-module.md)) and reserved plugin registry
  entries (EXC-2).
- The knowledge system, CI gates, and governance docs reference the new layout; stale
  pre-1.6.0 architecture docs are explicitly superseded by
  [../README.md](../README.md).

## Enforcement

`architecture/no-restricted-layer-imports`, `no-cross-module-deep-imports`,
`enforce-file-suffixes` (+ kebab-case) at error; `npm run quality:circular`;
rule tests in `tests/eslint/architecture-plugin.test.ts`.
