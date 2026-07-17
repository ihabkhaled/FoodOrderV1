# Architecture ESLint Plugin

The project-owned plugin in [`eslint/architecture-plugin/`](../../eslint/architecture-plugin/) mechanically enforces the v1.6.0 module-first architecture on the layered source tree (`src/app`, `src/modules`, `src/shared`, `src/platform`, `src/packages`). Every rule runs at `error` severity with `--max-warnings 0`; rule behavior is tested with ESLint's `RuleTester` in [`tests/eslint/architecture-plugin.test.ts`](../../tests/eslint/architecture-plugin.test.ts), which doubles as the valid/invalid fixture set.

When a rule fails, the code is in the wrong layer. Move or redesign the code. Do not disable the rule.

## Rules

### `architecture/no-raw-package-imports`

- **Purpose**: every third-party dependency has exactly one owning integration module under `src/packages/`; application code imports the owner's facade.
- **Registry**: [`eslint/package-ownership.config.mjs`](../../eslint/package-ownership.config.mjs) maps raw package → owner directory → public facade. Unregistered bare imports are also rejected, so a new dependency cannot enter application source without an ownership decision.
- **Foundational exceptions**: `react`, `react/jsx-runtime` (the UI runtime itself), `react-dom/client` (bootstrap). Test files and tooling configuration are outside the rule's scope.
- **Invalid**: `import { getFirestore } from 'firebase/firestore'` in a module gateway.
- **Valid**: same import inside `src/packages/firebase/`; `import { AppLink } from '@/packages/router'` anywhere.
- **Limitation**: subpath detection is prefix-based (`firebase/…` matches the `firebase` owner).

### `architecture/no-hooks-outside-hook-files`

- **Purpose**: React hook calls live only in dedicated hook files (`*.hook.ts` or `hooks/` directories).
- **Behavior**: `*.component.tsx` files may call no hooks at all. Containers, `*.routes.tsx`, and files under `providers/`, `shell/`, `router/` may call project-owned custom hooks (imported from a project path) but never built-in/vendor hooks. Defining a `useX` function outside a hook file is also rejected.
- **Invalid**: `useState` in a component; `useEffect` in a container; `export const useOrderTotals = () => …` in a service.
- **Valid**: `const vm = useOrdersViewModel()` in a container, where the hook is imported from `../hooks/use-orders-view-model.hook`.
- **Limitation**: project-hook detection is import-source-based; a vendor hook re-exported through a project path would pass this rule (but not `no-raw-package-imports` at its definition site).

### `architecture/no-cross-module-deep-imports`

- **Purpose**: `src/modules/<name>/index.ts` and `src/packages/<name>/index.ts` are the only public surfaces; internals are private.
- **Invalid**: `@/modules/buckets/helpers/bucket.helper` from another module; `@/packages/firebase/firestore.adapter` from anywhere outside the owner; equivalent `../../buckets/…` relative escapes.
- **Valid**: `@/modules/buckets`, `@/packages/firebase`, and any relative import within the same module.

### `architecture/no-restricted-layer-imports`

- **Purpose**: one-way dependency direction `app → modules → shared/platform → packages`.
- **Matrix**: `modules` ↛ `app`; `shared`/`platform` ↛ `app`, `modules`; `packages` ↛ `app`, `modules`, `shared`, `platform`. Relative escapes are resolved before matching.
- **Valid**: `platform` → `packages`, `shared` → `platform`, `app` → any public surface.

### `architecture/no-typescript-enum`

- **Purpose**: forbid `enum`/`const enum`; use `as const` objects with derived union types in `*.enums.ts` files.

### `architecture/no-browser-globals-outside-platform`

- **Purpose**: `window`, `document`, `navigator`, `localStorage`, `sessionStorage`, `matchMedia`, `history`, `location` are only touchable inside `src/platform`, which exposes testable, runtime-aware abstractions.
- **Limitation**: unprefixed timer/`crypto`/`URL` globals are allowed; they are runtime-neutral in this codebase.

### `architecture/no-env-outside-environment`

- **Purpose**: `import.meta.env` / `process.env` are readable only in `src/platform/environment`, which validates raw values once and exposes the typed `env` object.

### `architecture/no-inline-route-strings`

- **Purpose**: absolute route paths come from typed route constants/builders owned by each module's `routes/` layer; inline `'/…'` literals in `to=`/`href=` props and `navigate()` calls are rejected outside route-owner files.
- **Limitation**: detects literal arguments; a computed string that embeds a hardcoded path is caught in review, not by AST.

### `architecture/enforce-file-suffixes`

- **Purpose**: every file in the new layout declares its responsibility by suffix (`.component.tsx`, `.container.tsx`, `.provider.tsx`, `.routes.tsx`, `.hook.ts`, `.service.ts`, `.gateway.ts`, `.repository.ts`, `.queries.ts`, `.mutations.ts`, `.store.ts`, `.selectors.ts`, `.schema.ts`, `.mapper.ts`, `.helper.ts`, `.utils.ts`, `.factory.ts`, `.constants.ts`, `.types.ts`, `.interfaces.ts`, `.enums.ts`, `.variants.ts`, `.errors.ts`, `.adapter.ts`, `.api.ts`), with `index.ts`, `main.tsx`, and `*.d.ts` exempt.
- Paired with `unicorn/filename-case` (kebab-case) on the same paths.

## Requirement-to-enforcement mapping

The architecture specification's rule list is enforced by a combination of the custom plugin and the configured third-party plugins. Where a listed rule name has no dedicated custom implementation, this table records the mechanical equivalent:

| Requirement | Enforcement |
| --- | --- |
| no-hooks-in-components / no-built-in-hooks-outside-hook-files / no-third-party-hooks-outside-hook-files / one-hook-per-file (definition site) | `architecture/no-hooks-outside-hook-files` |
| one-component-per-file | `react-refresh/only-export-components` + component-file hook ban |
| no-typescript-enum | `architecture/no-typescript-enum` |
| no-inline-query-keys / no-server-state-in-client-store | not applicable: no server-state/query library is installed (Firestore SDK + service layer) |
| no-inline-route-paths / no-direct-navigation-outside-route-abstraction | `architecture/no-inline-route-strings` |
| no-raw-package-imports / no-raw-capacitor-imports | `architecture/no-raw-package-imports` |
| no-cross-module-deep-imports / no-internal-barrel-deep-import | `architecture/no-cross-module-deep-imports` |
| no-restricted-layer-imports / no-feature-imports-in-shared / no-module-imports-in-package-owners / no-app-imports-below-app-layer / no-react-in-services & gateways (via layer + suffix conventions) | `architecture/no-restricted-layer-imports` |
| no-direct-browser-api-outside-platform / no-direct-storage-api-outside-platform | `architecture/no-browser-globals-outside-platform` |
| no-import-meta-env-outside-environment / no-process-env-outside-environment | `architecture/no-env-outside-environment` |
| require-hook-filename / require-service-filename / require-gateway-filename / require-component-folder naming | `architecture/enforce-file-suffixes` + `unicorn/filename-case` |
| no-empty-catch | `no-empty` (eslint recommended) + `sonarjs` |
| no-undocumented-eslint-disable | `eslint-comments` behavior via review checklist; suppressions require an exception document (docs/exceptions/) |
| no-floating-promises / no-misused-promises | `@typescript-eslint` strict type-checked |
| complexity / max-nesting / duplicate strings | `sonarjs` recommended set |
| accessibility | `jsx-a11y` recommended |
| security (eval, injection, regexp) | `eslint-plugin-security`, `eslint-plugin-regexp` |
| import ordering / unused imports / cycles | `simple-import-sort`, `unused-imports`, `madge --circular` (CI gate) |
| dead code / unused exports | `knip` (CI gate) |
| focused/skipped tests | `@vitest/eslint-plugin` + `eslint-plugin-playwright` |
| conventional commits | `commitlint` (husky `commit-msg`) |
