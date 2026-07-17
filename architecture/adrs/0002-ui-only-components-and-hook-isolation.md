# ADR-0002: UI-only components and hook isolation

- Status: Accepted
- Date: 2026-07-16

## Context

Hook calls were scattered through 22 page/component files (196 occurrences —
BucketCollaboratePage alone held 17). Screens mixed markup, data loading, and domain
decisions, making them untestable below the e2e level and impossible to move without
dragging their data dependencies along.

## Decision

Three-way split with mechanical enforcement:

- **Components** (`*.component.tsx`): pure UI, props in / callbacks out, ZERO hook calls.
- **Hooks** (`*.hook.ts` or `hooks/` dirs): the only files that may call built-in/vendor
  hooks; view-model hooks own screen behavior; `useX` definitions outside hook files are
  rejected.
- **Containers/providers/shell/router** (`*.container.tsx`, `*.provider.tsx`,
  `*.routes.tsx`, `providers/`, `shell/`, `router/`): may call project hooks only —
  wiring, not behavior.

## Consequences

- Components become trivially testable and reusable; view-model logic gets a name, a file,
  and a direct migration path for its pure parts into tested helpers.
- Boilerplate increases (a screen is now container + hook + components); accepted as the
  price of testability and enforceability.
- Providers must delegate their built-in hook usage to extracted hooks (the legacy
  `AppContext.tsx` pattern is migrated, not grandfathered).
- Some detection limits are documented rather than fought: project-hook detection is
  import-source-based (see `docs/eslint/README.md` limitations).

## Enforcement

`architecture/no-hooks-outside-hook-files` (error) with per-file-kind semantics;
`react-refresh/only-export-components`; `eslint-plugin-react-hooks` recommended
(`set-state-in-effect` deliberately off for the two documented benign patterns).
