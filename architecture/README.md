---
id: ARCH-README
title: Architecture
type: guide
authority: canonical
status: active
owner: architecture-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Authoritative v1.6.0 module-first architecture for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-16
verificationMethod: source and test inspection
contextTier: 1
generated: false
---

# Architecture

Governance-Version: 1

FoodOrderV1 is a single client application (React 19 + Vite 8 + Capacitor 8) with a thin
Firebase backend (Auth, Firestore, callable Functions) and a fully functional local-device
fallback selected at build time. As of v1.6.0 the source tree is a layered, module-first
architecture whose boundaries are mechanically enforced by the project-owned ESLint plugin
(`eslint/architecture-plugin/`, 9 rules at error severity, tested in
`tests/eslint/architecture-plugin.test.ts`, documented in
[../docs/eslint/README.md](../docs/eslint/README.md)).

The `src/` migration is in flight; this document describes the **target layout, which is
the enforced end state** — the plugin already rejects non-compliant code on all new-layout
paths. Progress: [../docs/migration/module-migration-status.md](../docs/migration/module-migration-status.md).

## The tree

```text
src/
├── main.tsx                     # bootstrap; only legal react-dom/client import
├── app/                         # COMPOSITION ONLY
│   ├── providers/               # mounts the session provider tree
│   ├── router/                  # composes module route fragments + guard layouts
│   └── shell/                   # app layout, auth layout, navigation chrome
├── modules/                     # FEATURE OWNERSHIP — one dir per feature
│   ├── auth/                    # login, register, forgot-password
│   ├── buckets/                 # bucket CRUD, editor, cards, filters
│   ├── group-orders/            # collaborate, invites/join, contributions, receipts
│   ├── orders/                  # order list/details/create, statuses
│   ├── social/                  # social page + social sharing
│   ├── notifications/           # notification center
│   ├── dashboard/               # home
│   ├── settings/                # runtime preferences (locale/currency/theme)
│   ├── session/                 # app-wide user/session/toast/locale provider + hooks
│   └── data-access/             # persisted domain types, service contracts,
│                                # dual cloud/local gateways, storage-mode selection
├── shared/                      # FEATURE-AGNOSTIC
│   ├── ui/                      # Loading, EmptyState, ErrorState, ConfirmDialog, ...
│   ├── helpers/                 # date, money, id, validation, pagination (pure)
│   └── i18n/                    # translate(locale, key) engine + core en/ar catalog
├── platform/                    # RUNTIME CAPABILITIES (sole browser-global territory)
│   ├── environment/             # sole env reader → typed env object
│   ├── browser/                 # document/window adapters (theme, lang/dir, listeners)
│   ├── device/                  # haptics, status bar, keyboard via capacitor facades
│   ├── network/                 # online/offline
│   └── storage/                 # persistent KV backing local-device mode
└── packages/                    # VENDOR FACADES (sole raw-import sites)
    ├── firebase/                # firestore/auth/callables + bilingual error table
    ├── router/                  # react-router-dom surface
    ├── icons/                   # lucide-react surface
    ├── virtuoso/                # react-virtuoso surface (exists pre-1.6.0)
    └── capacitor-core|-haptics|-network|-preferences|-status-bar/
```

Module internals follow one anatomy — `routes/`, `containers/`, `components/`, `hooks/`,
`helpers/`, `types/`, `index.ts` — detailed in
[../context/module-anatomy.md](../context/module-anatomy.md).

## Ownership rules

1. **Features** own their screens, components, hooks, helpers, and route definitions —
   exactly one module per feature; public API = `index.ts` only.
2. **`session`** owns app-wide state (identity, toasts, preferences); **`data-access`**
   owns persisted domain types, contracts, and both persistence backends (EXC-1).
3. **`shared`** owns code used by 2+ modules with zero feature knowledge.
4. **`platform`** owns every browser/device/env touchpoint.
5. **`packages`** own vendor dependencies one-to-one per the registry
   (`eslint/package-ownership.config.mjs`); foundational exceptions: `react`,
   `react/jsx-runtime`, `react-dom/client` (bootstrap only).
6. **`app`** owns nothing but composition.

## Dependency matrix

| importer ↓ / imported → | app | modules  | shared | platform | packages | vendor     |
| ----------------------- | --- | -------- | ------ | -------- | -------- | ---------- |
| app                     | —   | surface  | yes    | yes      | surface  | react only |
| modules                 | NO  | surface* | yes    | yes      | surface  | react only |
| shared                  | NO  | NO       | —      | yes      | surface  | react only |
| platform                | NO  | NO       | NO     | —        | surface  | react only |
| packages                | NO  | NO       | NO     | NO       | own dir  | owned pkg  |

`*` feature modules → `session`/`data-access` only among modules; no cycles. Enforced by
`architecture/no-restricted-layer-imports` and `no-cross-module-deep-imports`; verified by
`npm run lint` and `npm run quality:circular`.

## Cross-cutting mechanics

- **Hook isolation**: hooks only in `*.hook.ts`/`hooks/`; components zero hooks;
  containers project-hooks-only ([ADR-0002](adrs/0002-ui-only-components-and-hook-isolation.md)).
- **Routing**: typed constants/builders in module `routes/`; the real route table lives in
  [../context/routing-map.md](../context/routing-map.md).
- **State**: session context + service singletons; no store/query library
  ([../rules/11-state-management.md](../rules/11-state-management.md)).
- **Errors**: normalized at the vendor boundary, bilingual copy
  ([ADR-0006](adrs/0006-error-normalization.md)).
- **Dual persistence**: cloud/local gateway pairs behind contracts, mode chosen at startup
  from env ([ADR-0005](adrs/0005-data-access-module.md);
  [../context/data-boundary-map.md](../context/data-boundary-map.md)).
- **Testing**: e2e-first for screens, 100% pure layers
  ([ADR-0007](adrs/0007-testing-and-coverage-policy.md)).
- **File naming**: kebab-case + responsibility suffix
  ([../rules/18-file-naming.md](../rules/18-file-naming.md)).

## Decisions and history

Active decision records: [adrs/](adrs/README.md) (0001–0008, plus the pre-1.6.0
[decisions/active/ADR-001-capacitor-migration.md](decisions/active/ADR-001-capacitor-migration.md)).
The sibling documents in this directory (`current-state.md`, `target-state.md`,
`system-overview.md`, `data-flow.md`, `mobile-architecture.md`, `security-architecture.md`,
`sharing-design.md`, `testing-architecture.md`, `migration-guide.md`) predate v1.6.0;
where they conflict with this README or the ADRs, this README wins. Deviations from this
architecture exist only as documented exceptions
([../docs/exceptions/README.md](../docs/exceptions/README.md); active set EXC-1..EXC-5 in
[../docs/migration/unresolved-exceptions.md](../docs/migration/unresolved-exceptions.md)).
