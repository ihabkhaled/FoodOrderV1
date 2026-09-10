# environment

The sole reader of Vite build-time env vars (`import.meta.env`), normalized
into one typed object.

## Responsibility

Reads `import.meta.env` exactly once and exposes a typed, trimmed-string
`env` object — deliberately excludes locale/currency, which are runtime
device settings owned by `@/platform/device`, not build-time configuration.

## Public exports (`@/platform/environment`)

- `env` — `appName`, `appVersion` (from the `__APP_VERSION__` build define),
  `initialLocale`, `initialCurrency`, `firebase` (nested config),
  `webPushPublicKey`, `webPushConfigured`, `firebaseEnabled` (true only when
  not force-local-mode and every required Firebase key is present).
- `isProdBuild` — `import.meta.env.PROD` passthrough, used to gate service
  worker registration.

## Structure

- `environment.adapter.ts` — the only file: an internal `FirebaseEnvironment`
  interface, a `get(key)` trimming reader, and the `env`/`isProdBuild`
  exports.

## Dependencies

`@/shared/i18n` (`DEFAULT_LOCALE`, `isSupportedLocale`) to validate
`VITE_DEFAULT_LOCALE`.

## Testing

None found directly; referenced only as fixture strings in the architecture
ESLint plugin's own test suite.
