# ui

Cross-module presentational React components and pull-to-refresh/tour/
loading infrastructure that carry zero feature-domain knowledge — every
string is passed in by the caller, with two exceptions
(`RefreshableViewport` / `VirtualListFooter`) that call `translate` directly
with a caller-supplied locale.

## Responsibility

Shared UI primitives no single feature module owns: navigation and dialog
chrome, form controls, loading/empty/error states, the guided-tour overlay,
and the pull-to-refresh gesture container.

## Public exports (`@/shared/ui`)

- `BackLink` — resolves its destination from router `location.state.from`
  when safe, else a caller-supplied fallback.
- `BusyButton` (+ `BusyButtonProps`) — self-disables and shows a spinner
  while `busy`, so a slow request can't be double-submitted.
- `ConfirmDialog`, `DangerReauthDialog` — native `<dialog>`-based confirm and
  credential-reauth modals.
- `EmptyState`, `ErrorState` — "nothing here yet" / `role="alert"` retry
  states.
- `FeatureTour` (+ `FeatureTourStep`) — spotlight guided-tour overlay; reads/
  writes per-page dismissal via `@/platform/device` and measures its target
  element via `@/platform/browser`.
- `LanguageSelect` — locale picker rendering each locale's own native name.
- `LinkRow` (+ `LinkRowProps`) — one tappable icon+title+hint navigation row.
- `Loading` — a rotating loader with no assumed layout shape.
- `NumericField` — tracks a separate text draft so a zero shows as an empty
  placeholder and partial entries like `"1."` survive re-renders.
- `PasswordField` — show/hide toggle with a visually-hidden accessible name.
- `RefreshableViewport`, `usePageRefresh` — pull-to-refresh gesture
  container built on a `RefreshContext`; triggers a haptic on refresh.
- `Skeleton`, `SkeletonSection` (+ types) — decorative loading placeholders
  wrapped in one `role="status"` region.
- `useUndoableDelete` (+ `UndoableDeleteController` / `UndoableDeleteOptions`
  types) — schedules a destructive write instead of running it immediately:
  `schedule(id, commit)` marks `id` pending (for the caller to filter out of
  its own rendered list) and fires `commit` after a grace window unless
  `cancel(id)` is called first. No UI of its own — pair it with a
  `showToast(..., { label, onClick })` action.
- `VirtualListFooter` — retry / loading / "all results loaded" footer for
  virtualized or paginated lists.

Two global stylesheets, imported once at app bootstrap rather than through
this barrel: `shell-alignment.css` (auth-shell/controls layout) and
`ux-polish.css` (design-token overrides for elevation, motion, touch target).

## Structure

- Component/container/hook split (`*.component.tsx`, `*.container.tsx`,
  `use-*.hook.ts`, `index.ts`): `back-link/`, `confirm-dialog/`,
  `danger-reauth-dialog/`, `feature-tour/` (+ `feature-tour.types.ts`),
  `numeric-field/`, `password-field/`.
- Single-file, hook-free: `busy-button/`, `empty-state/`, `error-state/`,
  `link-row/`, `loading/`, `language-select/` (+ `.types.ts`),
  `virtual-list-footer/` (+ `.types.ts`), `skeleton/`.
- `refresh/` — the most structurally complex: `refresh-context.store.ts`,
  `providers/refresh.provider.tsx`, `use-refresh-controller.hook.ts`
  (register/refresh state machine shared across a page),
  `refreshable-viewport.container.tsx` + `.component.tsx` + `.types.ts`,
  `use-refreshable-viewport.hook.ts` (touch gesture math), and
  `use-page-refresh.hook.ts` (the registration hook pages call).
- `undo/` — `use-undoable-delete.hook.ts` (the pending-id timer map) +
  `index.ts`. No component; renders nothing itself.

## Dependencies

`@/platform/browser` (element measurement, viewport scroll),
`@/platform/device` (tour dismissal, haptic), `@/shared/i18n` (`translate`
and locale constants), `@/shared/types` (`Locale`), `@/packages/icons`,
`@/packages/router` (`Link`, `useLocation`).

## Testing

`tests/components/{BackLink,BusyButton,ConfirmDialog,DangerReauthDialog,
LanguageSelect,LinkRow,Loading,NumericField,PasswordField,Skeleton,
UndoableDelete}.test.tsx`; e2e: `tests/e2e/feature-tour.spec.ts`,
`tests/e2e/ui.spec.ts` (`.refresh-viewport`),
`tests/e2e/responsive-navigation.spec.ts` (`.virtual-list-footer`),
`tests/e2e/undo-delete.spec.ts` (the delete flows that consume
`useUndoableDelete`, not this hook directly). `EmptyState`/`ErrorState` have
no dedicated unit test — only indirect coverage through screens that render
them in e2e specs.
