# Package ownership map

Registry of record: `eslint/package-ownership.config.mjs`, enforced by
`architecture/no-raw-package-imports`. Live wrapper status:
[../docs/migration/package-wrapper-status.md](../docs/migration/package-wrapper-status.md).
Rule: [../rules/08-package-ownership.md](../rules/08-package-ownership.md).

## Owners

| Dependency                | Owner directory                      | Facade                             | Notes                                       |
| ------------------------- | ------------------------------------ | ---------------------------------- | ------------------------------------------- |
| `firebase` (all subpaths) | `src/packages/firebase`              | `@/packages/firebase`              | Also owns the bilingual error table (EXC-4) |
| `react-router-dom`        | `src/packages/router`                | `@/packages/router`                | Link/navigation primitives + router hooks   |
| `lucide-react`            | `src/packages/icons`                 | `@/packages/icons`                 | Curated icon set                            |
| `react-virtuoso`          | `src/packages/virtuoso`              | `@/packages/virtuoso`              | Wrapped pre-1.6.0 (exists today)            |
| `@capacitor/core`         | `src/packages/capacitor-core`        | `@/packages/capacitor-core`        | Runtime detection                           |
| `@capacitor/haptics`      | `src/packages/capacitor-haptics`     | `@/packages/capacitor-haptics`     |                                             |
| `@capacitor/network`      | `src/packages/capacitor-network`     | `@/packages/capacitor-network`     |                                             |
| `@capacitor/preferences`  | `src/packages/capacitor-preferences` | `@/packages/capacitor-preferences` |                                             |
| `@capacitor/status-bar`   | `src/packages/capacitor-status-bar`  | `@/packages/capacitor-status-bar`  |                                             |

## Special cases

- **Foundational** (no facade needed): `react`, `react/jsx-runtime`; `react-dom/client`
  restricted to `src/main.tsx`. This list is closed.
- **Reserved, no owner module** (EXC-2): `@capacitor/app`, `@capacitor/keyboard` — native
  runtime dependencies with zero web import sites; first web use creates the owner.
- **Out of registry scope**: `tests/**`, build/tooling config, and dev-only packages never
  imported by application source (`firebase-admin`, `firebase-tools`, vitest/playwright
  tooling, ...).

## Consumption direction

Facades are the bottom project layer: `platform` consumes `capacitor-*`; `data-access`
gateways consume `firebase`; UI layers consume `router`/`icons`/`virtuoso`. Modules never
import a `capacitor-*` facade directly — they use the `src/platform` abstraction.

Adding a dependency: [../skills/create-package-owner.md](../skills/create-package-owner.md)
(or [../skills/add-capacitor-plugin.md](../skills/add-capacitor-plugin.md)).
