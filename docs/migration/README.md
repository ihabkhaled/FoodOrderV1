# v1.6.0 Module-First Architecture Migration

This directory tracks the migration of the application source from the legacy
layout (`src/components`, `src/pages`, `src/services`, `src/state`, `src/lib`,
`src/hooks`, `src/config`, `src/i18n`, `src/types`) to the layered
module-first architecture:

```text
src/
├── app/        # composition only: providers, router, shell
├── modules/    # feature ownership: auth, buckets, group-orders, orders,
│               # social, notifications, dashboard, settings,
│               # session (app-wide user state), data-access (domain model +
│               # dual cloud/local persistence gateways)
├── shared/     # feature-agnostic UI, helpers, i18n core
├── platform/   # runtime capabilities: environment, browser, device,
│               # network, storage
└── packages/   # third-party ownership facades (firebase, router, icons,
                # capacitor-*, virtuoso)
```

Documents:

- [architecture-violation-inventory.md](architecture-violation-inventory.md) — real findings from the pre-migration source tree (the migration backlog).
- [module-migration-status.md](module-migration-status.md) — per-module progress and definition of done.
- [package-wrapper-status.md](package-wrapper-status.md) — third-party ownership status per dependency.
- [test-coverage-status.md](test-coverage-status.md) — test map and coverage posture.
- [native-security-audit.md](native-security-audit.md) — Capacitor/native configuration findings.
- [unresolved-exceptions.md](unresolved-exceptions.md) — deliberate, documented deviations with owners and removal conditions.

Enforcement is mechanical from the first migration commit: the custom ESLint
plugin (`eslint/architecture-plugin/`) runs at `error` severity on all new
layout paths, so code enters the new structure only in a compliant state.
Legacy directories are removed as their contents migrate; when they are gone,
enforcement covers the entire application source.
