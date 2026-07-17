# auth

Guest-facing authentication screens: login, register, forgot password, and
the in-app password-reset action handler.

## Responsibility

- Form state, validation, and submission for the auth flows
  (`useApp().login/register/resetPassword`).
- In-app Firebase email-action handler at `/auth/action`
  (`?mode=resetPassword&oobCode=…`): verifies the code on mount, consumes it
  only on submit (`authService.verifyPasswordResetCode/confirmPasswordReset`).
  See `docs/operations/password-reset.md` for the console Action URL setup.
- Post-authentication redirect and cross-links between auth screens.

## Public exports (`@/modules/auth`)

- `authRoutes` — route descriptors mounted under the `/auth` guest layout.
- `AUTH_PATH`, `LOGIN_PATH`, `REGISTER_PATH`, `FORGOT_PASSWORD_PATH`,
  `RESET_PASSWORD_PATH`, `POST_AUTH_REDIRECT_PATH` — absolute navigation
  targets owned here.

## Structure

- `containers/` — thin screens: one view-model hook call + form JSX
  (markup stays inline; the forms are small, purely presentational units).
  Password inputs render through the shared `PasswordField` (show/hide eye).
- `hooks/` — `use-login.hook.ts`, `use-register.hook.ts`,
  `use-forgot-password.hook.ts`, `use-reset-password.hook.ts` own all state,
  validation, and navigation.
- `routes/` — path constants + route descriptors.

## Dependencies

`@/modules/session` (useApp), `@/modules/data-access` (authService),
`@/packages/router`, `@/shared/ui` (PasswordField, Loading),
`@/shared/helpers` (isEmail, validatePassword), `@/shared/i18n`
(MessageKey type).

## Testing

Covered end-to-end by `tests/e2e/smoke.spec.ts` (register -> bucket -> order)
and the auth paths exercised by every e2e login/registration. The action
route is covered by `tests/components/ResetPasswordRoute.test.tsx`.
