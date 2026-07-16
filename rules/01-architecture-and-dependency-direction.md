# 01 — Architecture and dependency direction

## Rule

Application source is layered as `src/app` → `src/modules/*` → `src/shared` / `src/platform`
→ `src/packages` → vendor, and imports flow only downward. `shared` may import `platform`
and `packages`; `platform` may import `packages`; `packages` imports only vendor code.

## Motivation

The pre-migration tree mixed screens, business logic, persistence, and vendor APIs in the
same files (see [../docs/migration/architecture-violation-inventory.md](../docs/migration/architecture-violation-inventory.md)).
One-way layering makes every change locally reasoned: a vendor swap touches one package
facade, a feature change touches one module, a browser-API change touches `src/platform`.

## Required

- New code lands directly in its owning layer; migrated code moves whole (file plus tests).
- Composition (provider nesting, router assembly, app shell) lives only in `src/app`.
- Cross-layer access goes through public surfaces: `@/modules/<name>`, `@/packages/<name>`.
- Cycles are zero: `npm run quality:circular` (madge) must stay clean.

## Forbidden

- Any upward import: `modules` → `app`; `shared`/`platform` → `app` or `modules`;
  `packages` → anything project-side above it.
- Relative-path escapes that cross a layer boundary (`../../modules/...` from `shared`);
  the plugin resolves relative imports before matching.
- Reaching outside `src/` into sibling workspaces via relative paths (the legacy
  `src/lib/groupOrder.ts` → `packages/group-order-engine/src` escape is migration backlog,
  not a pattern).
- "Temporary" shared dumping grounds (`src/shared/misc`, `utils` grab-bags).

## Enforcement

- `architecture/no-restricted-layer-imports` (error) on `src/{app,modules,shared,platform,packages}/**`.
- `architecture/no-cross-module-deep-imports` (error) for surface integrity.
- `npm run quality:circular` in CI (`circular-dependencies` job).
- Rule tests: `tests/eslint/architecture-plugin.test.ts`.

## Definition of done

`npm run lint` reports zero architecture errors, madge finds no cycle, and the change adds
no `eslint-disable` for any `architecture/*` rule. If a dependency seems to need to point
upward, the code is in the wrong layer — move it (usually down into `shared`, `platform`,
or `data-access`), or file an exception per
[19-exceptions-policy.md](19-exceptions-policy.md).
