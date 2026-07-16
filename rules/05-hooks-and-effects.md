# 05 — Hooks and effects

## Rule

React hooks (built-in, vendor, and custom) are called and defined only in dedicated hook
files: `*.hook.ts` or files under a `hooks/` directory. Containers, providers,
`*.routes.tsx`, shell, and router files may call project-owned hooks only.

## Motivation

Hook isolation makes stateful behavior a named, importable, individually reviewable unit
(a view-model), instead of logic smeared through JSX. It is the core mechanism that keeps
components pure and containers thin.

## Required

- One primary hook per file, named `use<Thing>` in a kebab-case file
  (`use-orders-view-model.hook.ts`); module hooks live in `src/modules/<name>/hooks/`.
- Vendor hooks are wrapped once: router hooks (`useNavigate`, `useParams`) are re-exposed
  through `@/packages/router`; a project hook consumes the facade.
- Effects: every `useEffect` has a correct dependency array (`react-hooks/exhaustive-deps`
  stays on), cleans up subscriptions/timers, and guards async completion after unmount.
- Timers and browser APIs inside hooks go through `src/platform` abstractions, not
  `window.setTimeout` directly.

## Forbidden

- Calling any hook in a `*.component.tsx` file (zero-hook rule).
- Calling built-in/vendor hooks in containers/providers/shell/router files.
- Defining a `useX` function outside a hook file (the plugin rejects the definition site).
- Suppressing `react-hooks/rules-of-hooks` or `react-hooks/exhaustive-deps`.
- Data fetching in effects that duplicates what a service subscription already provides.

## Enforcement

- `architecture/no-hooks-outside-hook-files` (error) — see
  [../docs/eslint/README.md](../docs/eslint/README.md) for exact semantics and limitations.
- `eslint-plugin-react-hooks` recommended set (note: `react-hooks/set-state-in-effect` is
  deliberately off in `eslint.config.js` for guarded mount loaders — documented there).

## Definition of done

The hook file lints clean, both typechecks pass, the hook's observable behavior is covered
(unit test for pure logic; the owning screen's e2e journey for wiring), and no consumer
outside hook files calls a built-in hook.
