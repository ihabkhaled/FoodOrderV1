# 03 — Components

## Rule

A component (`*.component.tsx`) is pure UI: it renders from props and reports user intent
through callback props. It calls zero hooks — not even `useState`.

## Motivation

The legacy tree had 196 hook calls across 22 page/component files
([../docs/migration/architecture-violation-inventory.md](../docs/migration/architecture-violation-inventory.md)).
Hook-free components are trivially testable, reusable across containers, and safe to move.

## Required

- Kebab-case file with `.component.tsx` suffix inside the owning module's `components/`
  (or `src/shared/ui` when genuinely feature-agnostic, e.g. the migrated `Loading`,
  `EmptyState`, `ErrorState`, `ConfirmDialog`, `VirtualListFooter`, `RefreshableViewport`).
- Exactly one exported component per file.
- All text via i18n message props/keys ([15-internationalization.md](15-internationalization.md));
  all icons via `@/packages/icons`; virtual lists via `@/packages/virtuoso`.
- Accessible markup by construction: semantic elements, labels, keyboard operability
  ([14-accessibility.md](14-accessibility.md)).

## Forbidden

- Any hook call (enforced), including third-party hooks.
- Importing services, gateways, `@/packages/firebase`, or `src/platform` — data arrives as
  props.
- Local component state for anything a container should own; DOM access (`document`,
  `window`) — needs a platform abstraction passed down.
- Inline absolute route strings; navigation intent is a callback or a typed route constant
  from the module's `routes/`.

## Enforcement

- `architecture/no-hooks-outside-hook-files` (component files: zero hooks).
- `architecture/no-browser-globals-outside-platform`, `architecture/no-inline-route-strings`,
  `architecture/enforce-file-suffixes`, `react-refresh/only-export-components`, `jsx-a11y`.

## Definition of done

The component renders purely from props in a Vitest + Testing Library test (or is covered
by the owning screen's Playwright journey per EXC-3), lints clean, and contains no import
from services, platform, or vendor packages other than owned facades for UI primitives.
