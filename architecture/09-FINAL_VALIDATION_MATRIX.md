# 09 — Final validation matrix

Run the smallest direct proof during implementation, then the full lane once the change reaches a fixed point.

| Change area | Direct proof | Final required evidence |
|---|---|---|
| Pure domain or pricing | Direct unit/invariant tests | Typecheck, lint, coverage, build |
| React module or shell | Component/direct tests | Chromium desktop/mobile/tablet E2E, accessibility, responsive overflow, build |
| Public content / SEO | Catalog and prerender validation | `public:generate`, `public:validate`, metadata/canonical/hreflang assertions, browser smoke |
| Social / group order | Social and group-order E2E | Multi-user lifecycle, permissions, notifications, critical E2E |
| Data adapter | Integration tests | Affected E2E, both typechecks, build |
| Firestore rules | Emulator allow/deny tests | Rules gate and deployment plan |
| Cloud Functions | Functions unit/type/build | Batched deploy, callable smoke, deployment health |
| Native / Capacitor | Web behavior and adapter tests | Build, `cap sync`, Android/iOS smoke as applicable |
| Knowledge / AI governance | Tooling tests and generator check | Knowledge build/validate, agent-doc checker, no stale generated artifacts |
| Release metadata | Version checker | Changelog/release notes, all required CI gates |

## Completion gate

A release is complete only when the requested behavior is implemented, explicit acceptance conditions are proven, mandatory gates are green for the current head, generated knowledge is current, and no known blocking regression remains. Optional findings are recorded and deferred; they do not extend the task.
