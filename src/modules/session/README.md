# session

The single app-wide session/auth/preferences context: the current user,
profile, auth-loading state, online status, storage mode, resolved locale/
theme/currency/analytics-consent, toast state, and the `t()`/`errorMessage()`
translators — plus every mutation on it. The one piece of global client
state every other feature module reads via `useApp()`.

## Responsibility

- Subscribes to `authService` and loads the profile via
  `dataService.getProfile`.
- Applies document theme/locale/direction, tracks online status and
  analytics consent, and sets telemetry context.
- Implements every session mutation: `login`, `register`, `resetPassword`,
  `logout`, `saveProfile`, `setDeviceLocale`, `setDeviceTheme`, `showToast`
  (auto-dismisses after 3.6s, or 6s when it carries an action such as
  "Undo" — see `@/shared/ui`'s `useUndoableDelete`).
- `saveProfile` only triggers a locale-prefixed page navigation when the
  locale it's given actually differs from the profile's current one — not
  on every save (see [release-notes/v1.11.0.md](../../../release-notes/v1.11.0.md)
  Phase E for why that distinction matters).

## Public exports (`@/modules/session`)

- `useApp` — reads `AppContext`; throws if called outside `AppProvider`.
  Returns the full `AppContextValue`.
- `AppProvider` — the context provider; wraps `useSessionController()` and
  accepts an optional `initialLocale` for locale-prefixed routes.
- `ToastState` (type) — `{ message: string; kind: 'success' | 'error' |
  'info'; action?: ToastAction }`.
- `ToastAction` (type) — `{ label: string; onClick: () => void }`, an
  optional button a toast can carry (e.g. "Undo").

## Structure

- `providers/session.provider.tsx` — `AppProvider`; delegates all logic to
  the hook below.
- `hooks/use-session-controller.hook.ts` — the actual state machine (not
  exported from the barrel).
- `hooks/use-app.hook.ts` — `useApp`, the context-reading hook.
- `store/session-context.store.ts` — the `AppContext`.
- `types/session.types.ts` — `AppProviderProps`, `ToastState`,
  `AppContextValue`.

## Dependencies

`@/modules/data-access` (`authService`, `dataService`, `storageMode`, domain
types), `@/modules/telemetry` (consent, event recording),
`@/packages/firebase` (error translation), `@/platform/{browser,device,
environment,network}`, `@/shared/{i18n,types}`. No dependency on any other
feature module — virtually every other module depends on `session` via
`useApp()`.

## Testing

`tests/components/ResetPasswordRoute.test.tsx` renders `authRoutes` inside a
real `AppProvider`. No dedicated unit test exists for
`use-session-controller.hook.ts` itself, but because `AppProvider` wraps the
entire app, the whole `tests/e2e/*.spec.ts` suite (auth-flows, locale-switch,
settings, smoke, and more) exercises this module's login/register/profile/
locale/theme/toast logic end-to-end.
