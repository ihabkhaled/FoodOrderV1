# Package Wrapper Status

Registry of record: [`eslint/package-ownership.config.mjs`](../../eslint/package-ownership.config.mjs)
(enforced by `architecture/no-raw-package-imports`).

| Dependency | Owner | Facade | Status |
| --- | --- | --- | --- |
| `react-virtuoso` | `src/packages/virtuoso` | `@/packages/virtuoso` | wrapped (pre-1.6.0) |
| `firebase` | `src/packages/firebase` | `@/packages/firebase` | pending |
| `react-router-dom` | `src/packages/router` | `@/packages/router` | pending |
| `lucide-react` | `src/packages/icons` | `@/packages/icons` | pending |
| `@capacitor/core` | `src/packages/capacitor-core` | `@/packages/capacitor-core` | pending |
| `@capacitor/haptics` | `src/packages/capacitor-haptics` | `@/packages/capacitor-haptics` | pending |
| `@capacitor/network` | `src/packages/capacitor-network` | `@/packages/capacitor-network` | pending |
| `@capacitor/preferences` | `src/packages/capacitor-preferences` | `@/packages/capacitor-preferences` | pending |
| `@capacitor/status-bar` | `src/packages/capacitor-status-bar` | `@/packages/capacitor-status-bar` | pending |
| `@capacitor/app`, `@capacitor/keyboard` | registry entries reserved | — | native runtime dependencies only; no web import sites, so no owner module is created (see unresolved-exceptions.md) |
| `react`, `react-dom/client` | foundational exception | — | documented in the registry |
| `firebase-admin`, `firebase-tools`, test/build tooling | out of scope | — | devDependencies never imported by application source |
