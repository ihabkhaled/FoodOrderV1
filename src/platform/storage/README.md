# storage

The sole facade for persistent key-value storage.

## Responsibility

Two storage backends, kept separate on purpose: Capacitor `Preferences` for
roaming device settings (async, cross-platform) and plain `localStorage` for
device-local databases/sessions used by local-mode (sync, web-only).

## Public exports (`@/platform/storage`)

- `getPreference(key)`, `setPreference(key, value)`,
  `removePreference(key)` — async wrappers around Capacitor `Preferences`.
- `readWebStorage(key)`, `writeWebStorage(key, value)`,
  `removeWebStorage(key)` — synchronous `localStorage` wrappers.

## Structure

- `preferences.adapter.ts` — Capacitor Preferences plugin wrapper.
- `web-storage.adapter.ts` — plain `localStorage` wrapper.

## Dependencies

`@/packages/capacitor-preferences` (`Preferences`). No other repo imports.

## Testing

`tests/services/deviceConfig.test.ts` mocks `preferences.adapter` to test
`@/platform/device`'s consumption of it.
