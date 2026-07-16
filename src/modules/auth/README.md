# auth

Guest-facing authentication screens: login, register, forgot password.

## Responsibility

- Form state, validation, and submission for the three auth flows
  (`useApp().login/register/resetPassword`).
- Post-authentication redirect and cross-links between auth screens.

## Public exports (`@/modules/auth`)

- `authRoutes` — route descriptors mounted under the `/auth` guest layout.
- `AUTH_PATH`, `LOGIN_PATH`, `REGISTER_PATH`, `FORGOT_PASSWORD_PATH`,
  `POST_AUTH_REDIRECT_PATH` — absolute navigation targets owned here.

## Structure

- `containers/` — thin screens: one view-model hook call + form JSX
  (markup stays inline; the forms are small, purely presentational units).
- `hooks/` — `use-login.hook.ts`, `use-register.hook.ts`,
  `use-forgot-password.hook.ts` own all state, validation, and navigation.
- `routes/` — path constants + route descriptors.

## Dependencies

`@/modules/session` (useApp), `@/packages/router`, `@/shared/helpers`
(isEmail, validatePassword), `@/shared/i18n` (MessageKey type).

## Testing

Covered end-to-end by `tests/e2e/smoke.spec.ts` (register -> bucket -> order)
and the auth paths exercised by every e2e login/registration.
