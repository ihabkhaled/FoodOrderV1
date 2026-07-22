# 04 — Containers

## Rule

A container (`*.container.tsx`) is the orchestration seam of a screen or panel: it calls
exactly the project hooks it needs (view-model hooks from the module's `hooks/`, plus
`session` hooks) and composes UI-only components. Containers contain no business logic and
no built-in hook calls.

## Motivation

Legacy pages (e.g. `SocialPage.tsx`, 674 lines) mixed screen markup, data loading, and
domain decisions. Splitting container (wiring) from hook (behavior) from component (markup)
gives each part a single reason to change and a natural test level.

## Required

- Kebab-case `.container.tsx` in the module's `containers/`.
- Data and behavior come from one or few view-model hooks
  (`const vm = useOrdersViewModel()` from `../hooks/use-orders-view-model.hook`).
- Rendering delegates to `*.component.tsx` children; conditional branches (loading / error /
  empty / content) use the shared UI states from `src/shared/ui`.
- Navigation via typed route constants/builders from the module's `routes/`.
- Container props contracts come from sibling `*.interfaces.ts`; view-state types and
  constants remain in their own declaration files.

## Forbidden

- Built-in or vendor hooks (`useState`, `useEffect`, `useNavigate`, ...) — wrap them in a
  project hook first (`architecture/no-hooks-outside-hook-files` allows containers project
  hooks only).
- Importing gateways or `@/packages/firebase` directly; talk to services through hooks.
- Business rules (price math, status transitions, permission checks) — those live in
  `data-access` domain helpers and are exercised through hooks.
- Rendering large bespoke markup blocks that should be components.
- Declaring interfaces, type aliases, enum-like value sets, or module constants inline.

## Enforcement

- `architecture/no-hooks-outside-hook-files` (containers: project hooks only).
- `architecture/no-inline-route-strings`, `architecture/no-restricted-layer-imports`,
  `architecture/enforce-file-suffixes`.

## Definition of done

The container is a thin wiring file (typically well under ~150 lines), its behavior is
covered by the screen's Playwright journey (`npm run test:e2e`), lints clean with zero
architecture errors, and every hook it calls is imported from a project path.
