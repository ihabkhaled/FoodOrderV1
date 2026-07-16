# State ownership map

Rule: [../rules/11-state-management.md](../rules/11-state-management.md). No store or
query library — React context (session) + service singletons + hook state, period.

| State                                                               | Owner                                                                                                                                      | Persistence                                   | Consumers                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------------- |
| Authenticated user + profile                                        | `session` module provider (legacy `src/state/AppContext.tsx`)                                                                              | Firebase SDK (IndexedDB) / local-mode storage | Guards in app router; module hooks                                    |
| Auth loading/lifecycle                                              | `session`                                                                                                                                  | —                                             | Route guards                                                          |
| Toasts                                                              | `session`                                                                                                                                  | none (transient)                              | Any container via session hook                                        |
| Locale (`en`/`ar`) + direction                                      | `session`, persisted via `src/platform/storage` (legacy `deviceConfig.ts`)                                                                 | device storage                                | `src/shared/i18n` lookups; `src/platform/browser` writes `lang`/`dir` |
| Currency (default `EGP`)                                            | `session` + platform storage                                                                                                               | device storage                                | money formatting helpers                                              |
| Theme                                                               | `session` + platform storage; system via `matchMedia` in `src/platform/browser`                                                            | device storage                                | shell styling                                                         |
| Online/offline                                                      | `src/platform/network` → session                                                                                                           | —                                             | offline indicators, gateway behavior                                  |
| Storage mode (cloud vs local)                                       | `data-access` storage-mode selection, decided once at startup from `src/platform/environment` (`VITE_FORCE_LOCAL_MODE`, `VITE_FIREBASE_*`) | build-time env                                | gateway selection only                                                |
| Domain data (buckets, orders, contributions, notifications, social) | `data-access` gateways (subscriptions/fetches)                                                                                             | Firestore or local storage                    | module view-model hooks — never cached in session                     |
| Pagination cursors                                                  | pagination services in `data-access` + `useCursorPage`-style hooks                                                                         | —                                             | list screens (buckets, orders)                                        |
| Screen state (filters, forms, dialogs, timers)                      | owning module's view-model hooks                                                                                                           | none                                          | that module's containers                                              |
| Pull-to-refresh viewport state                                      | shared UI (`RefreshableViewport` + its hook, legacy `RefreshContext`)                                                                      | —                                             | list screens                                                          |

## Invariants

- Session holds identity + preferences + transient UI signals. It never caches domain
  collections (stale-ownership hazard).
- Domain state has exactly one source of truth: the gateway subscription. Hooks derive,
  never duplicate-and-sync.
- Preferences are runtime-changeable (Settings screen) — env `VITE_DEFAULT_LOCALE`/
  `VITE_DEFAULT_CURRENCY` are first-run defaults only.
- Cross-module communication goes through `session`'s public surface or through
  `data-access` data — never through a new shared context.
