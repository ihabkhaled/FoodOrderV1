# 11 — State management

## Rule

App-wide state (authenticated user, profile, session lifecycle, toasts, locale/currency/
theme runtime preferences, online status) lives in the `session` module's provider and is
consumed via its hooks. Everything else is either local view-model state inside a module
hook, or persisted data behind `data-access` services. No global store library, no
server-state query library.

## Motivation

The app's state needs are deliberately small: one session context (legacy
`src/state/AppContext.tsx`) plus service singletons has shipped every release since v1.0.0.
Adding Redux/Zustand/React Query would create a second source of truth for data the
gateways already own (subscriptions, pagination cursors, mutation replay).

## Required

- `src/modules/session` exposes a provider (mounted once in `src/app/providers`) and
  focused hooks (e.g. session/user, toast, preferences); provider files delegate built-in
  hook usage to extracted hooks per [05-hooks-and-effects.md](05-hooks-and-effects.md).
- Device-level runtime preferences (language/currency/theme — changeable anytime in
  Settings) persist through `src/platform/storage`; theme/lang/dir DOM writes go through
  `src/platform/browser`.
- Screen state (filters, form drafts, dialog visibility) lives in the owning module's
  view-model hooks, not in session.
- Server data flows: gateway subscription/fetch → view-model hook → container props.

## Forbidden

- Adding redux, zustand, jotai, mobx, @tanstack/react-query, swr, or equivalents
  (the ownership registry blocks unregistered imports mechanically).
- Caching server documents in session state (stale-ownership bugs); session holds identity
  and preferences, not domain collections.
- Cross-module state sharing outside `session`'s public surface.
- Prop-drilling workarounds via new module-level contexts when a hook + props suffices.

## Enforcement

- `architecture/no-raw-package-imports` (unregistered dependency = lint error),
  `architecture/no-hooks-outside-hook-files`, layer matrix.
- Review checklist ([21-review-checklist.md](21-review-checklist.md)).

## Definition of done

State lives at the narrowest sufficient scope; session's public surface is unchanged or
consciously versioned; RTL/theme/locale switching still works end-to-end
(`tests/e2e/ui.spec.ts` covers responsive shell/theme/RTL).
