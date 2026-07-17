# settings

The `/settings` screen: profile preferences, storage metadata, data export,
and account deletion.

## Responsibility

- Profile form (full name, language, theme, default currency) synced from
  the session profile and saved via `useApp().saveProfile`.
- Read-only metadata (storage mode, connection, app version).
- JSON data export (`dataService.exportUserData` + platform file download).
- Danger zone: confirm-dialog-guarded full account deletion
  (`dataService.deleteAllUserData` + `authService.deleteAccount`).

## Public exports (`@/modules/settings`)

- `settingsRoutes` — route descriptor mounted under the protected app layout.
- `SETTINGS_PATH` — absolute navigation target owned by this module.

## Structure

- `containers/settings.container.tsx` — one view-model hook call + form JSX.
- `hooks/use-settings.hook.ts` — all state, effects, and service calls.
- `components/settings-metadata/` — pure metadata grid.
- `routes/` — path constant + route descriptor.

## Dependencies

`@/modules/data-access` (authService, dataService, profile types),
`@/modules/session` (useApp), `@/platform/{browser,device,environment}`,
`@/packages/icons`, `@/shared/ui` (ConfirmDialog).

## Testing

Exercised indirectly by e2e suites (language/theme persistence flows);
no dedicated unit tests — behavior lives in the view-model hook.
