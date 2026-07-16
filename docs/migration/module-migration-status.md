# Module Migration Status

Definition of done per module: files live under the module in their
responsibility layers (kebab-case + suffix), hooks isolated in `hooks/`,
components UI-only, route paths owned by `routes/` constants, public API via
`index.ts` only, imports through owned facades, existing tests updated and
green, module README written.

Final state (v1.6.0): **complete**. Application source consists solely of the
enforced layers `src/app`, `src/modules`, `src/shared`, `src/platform`,
`src/packages` plus the `src/main.tsx` bootstrap. All legacy directories
(`src/components`, `src/pages`, `src/services`, `src/state`, `src/hooks`,
`src/lib`, `src/config`, `src/i18n`, `src/types`, `src/App.tsx`) are removed.

| Target | Status |
| --- | --- |
| `src/packages/firebase` (incl. error-translation adapter) | done |
| `src/packages/router`, `src/packages/icons`, `src/packages/virtuoso` | done |
| `src/packages/capacitor-{core,haptics,network,preferences,status-bar}` | done |
| `src/platform/{environment,device,storage,network,browser}` | done |
| `src/shared/types` (localization primitives, route descriptor) | done |
| `src/shared/helpers` (date, money, id, validation, pagination — 100% covered) | done |
| `src/shared/i18n` (core catalog + translate, not-found keys added) | done |
| `src/shared/ui` (loading, empty/error states, confirm dialog, refresh system, virtual-list footer) | done |
| `src/modules/data-access` (contracts, types, domain helpers, 20 gateway files, selection surface) | done |
| `src/modules/session` (provider + controller/consumer hooks) | done |
| `src/modules/auth` | done |
| `src/modules/notifications` | done |
| `src/modules/social` (incl. decomposed social screen + social catalog) | done |
| `src/modules/settings` | done |
| `src/modules/group-orders` (collaborate/share/join + group-order catalog + receipt/pricing components) | done |
| `src/modules/orders` | done |
| `src/modules/buckets` | done |
| `src/modules/dashboard` | done |
| `src/app` (router, guards, localized not-found, shell layouts) | done |
| Legacy directory removal | done |

Violations resolved from the
[pre-migration inventory](architecture-violation-inventory.md): hook isolation
(196 occurrences → view-model hooks), raw vendor imports (63 files → owned
facades), browser globals (→ `src/platform`), env leak (→
`src/platform/environment`), inline route literals (→ module route
constants/builders), hardcoded copy in ErrorState and NotFound (→ catalog
keys, both locales), the two-component `BucketCards` file (→ two component
folders), one-gateway-per-file for every dual-implementation service, and the
`src/lib/groupOrder.ts` out-of-tree escape (→ owned helper re-export).
Remaining deliberate deviations are documented in
[unresolved-exceptions.md](unresolved-exceptions.md).
