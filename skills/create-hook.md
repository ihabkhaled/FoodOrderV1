# Skill: create a hook

## Required reading

[../rules/05-hooks-and-effects.md](../rules/05-hooks-and-effects.md),
[../rules/11-state-management.md](../rules/11-state-management.md), plus the existing
reference hooks (legacy `src/hooks/useCursorPage.ts`, `useBucketMutations.ts` until their
module homes land).

## Preconditions

- The behavior belongs to one module (module `hooks/`) or is feature-agnostic pagination/
  UI mechanics (`src/shared` hooks candidate — `useCursorPage` is the known example).
- Vendor APIs the hook needs are already exposed via `@/packages/*` or `src/platform`.

## Steps

1. Create `src/modules/<name>/hooks/use-<thing>.hook.ts` — one primary hook per file,
   named `use<Thing>`.
2. Compose from: built-in hooks, `@/modules/data-access` contracts,
   `@/modules/session` hooks, `src/platform` abstractions, and router hooks via
   `@/packages/router`.
3. Every effect: correct dependency array, cleanup for subscriptions/listeners/timers,
   unmount guard for async setState.
4. Return a cohesive view-model object (data, status flags, callbacks) — not a grab-bag.
5. Extract pure logic into `helpers/` so it is unit-testable without React.

## Forbidden shortcuts

- Defining the hook in a container/component file ("inline for now").
- `window.setTimeout`/listeners directly — go through `src/platform`.
- Suppressing `exhaustive-deps` instead of restructuring dependencies.
- Duplicating session state or caching gateway data in module state.

## Required tests

Unit tests for extracted pure helpers (100% target); hook wiring covered by the owning
screen's e2e journey. Shared mechanics hooks get direct unit tests where feasible.

## Validation

```bash
npm run lint && npm run typecheck && npm run typecheck:tsc && npm run test
npm run test:e2e   # owning journey
```

## Definition of done

Hook file lints clean under `architecture/no-hooks-outside-hook-files`, effects clean up,
pure logic extracted and tested, consumers import it from the module path.
