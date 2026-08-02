# settings

The `/settings` area: a hub screen linking to four focused subpages —
preferences, privacy, security, and data & account.

## Responsibility

- `/settings` — hub: profile summary, section links, storage metadata
  (connection, app version).
- `/settings/preferences` — profile form (full name, language, theme, default
  currency) synced from the session profile and saved via
  `useApp().saveProfile`.
- `/settings/privacy` — analytics consent radio group persisted through
  `@/modules/telemetry`.
- `/settings/security` — change password (current + new + confirmation) via
  `authService.changePassword`; works in Firebase and local-device modes with
  no email involved.
- `/settings/account` — JSON data export (`dataService.exportUserData` +
  platform file download) and the confirm-dialog-guarded full account deletion
  (`dataService.deleteAllUserData` + `authService.deleteAccount`).

## Public exports (`@/modules/settings`)

- `settingsRoutes` — route descriptors mounted under the protected app layout.
- `SETTINGS_PATH` — absolute navigation target owned by this module.

Subpage paths (`SETTINGS_PREFERENCES_PATH`, `SETTINGS_PRIVACY_PATH`,
`SETTINGS_SECURITY_PATH`, `SETTINGS_ACCOUNT_PATH`) live in
`routes/settings-route-paths.constants.ts` and stay module-internal until an
external consumer needs them.

## Structure

- `containers/settings-hub.container.tsx` — hub with section link rows.
- `containers/settings-preferences.container.tsx` — profile/preferences form.
- `containers/settings-privacy.container.tsx` — analytics consent form.
- `containers/settings-security.container.tsx` — change-password screen.
- `containers/settings-account.container.tsx` — export + danger zone.
- `hooks/use-settings-hub.hook.ts` — profile summary + metadata view model.
- `hooks/use-settings-preferences.hook.ts` — preferences form view model.
- `hooks/use-settings-privacy.hook.ts` — consent load/save view model.
- `hooks/use-settings-account.hook.ts` — export/delete view model.
- `hooks/use-change-password.hook.ts` — dedicated change-password view model.
- `components/settings-link-row/` — pure hub link row.
- `components/settings-metadata/` — pure metadata grid.
- `components/change-password-section/` — pure change-password form section.
- `routes/` — path constants + route descriptors.

## Dependencies

`@/modules/data-access` (authService, dataService, profile types),
`@/modules/session` (useApp), `@/modules/telemetry` (consent),
`@/platform/{browser,device,environment}`, `@/packages/icons`,
`@/packages/router` (Link), `@/shared/ui` (BackLink, ConfirmDialog,
LanguageSelect, PasswordField), `@/shared/helpers` (validatePassword).

## Testing

- `tests/components/SettingsLinkRow.test.tsx` — hub link row.
- `tests/e2e/settings.spec.ts` — hub navigation, preference save, consent save.
- Preference persistence across devices: `tests/e2e/auth-flows.spec.ts`.
