# ADR-0004: Platform boundary

- Status: Accepted
- Date: 2026-07-16

## Context

The app runs in three runtimes — desktop browser, Android WebView (Capacitor), and
Playwright's pure-web local mode — but browser globals were touched in 14 files
(`AppContext` matchMedia/document, six service files writing `localStorage`,
`NotificationCenter` document listeners, ...), and `import.meta.env` was read outside the
intended `src/config/env.ts` gateway. Runtime differences were untestable and the native
security audit had no single point of inspection.

## Decision

`src/platform` is the only layer allowed to touch browser globals (`window`, `document`,
`navigator`, `localStorage`, `sessionStorage`, `matchMedia`, `history`, `location`), and
`src/platform/environment` is the only reader of `import.meta.env`/`process.env` — it
validates raw values once (`VITE_FIREBASE_*`, `VITE_FORCE_LOCAL_MODE`, `VITE_APP_NAME`,
`VITE_DEFAULT_LOCALE`, `VITE_DEFAULT_CURRENCY`) and exposes a typed `env`. Platform
subareas: `environment`, `browser`, `device`, `network`, `storage`. Capacitor plugin
facades (`src/packages/capacitor-*`) are consumed only by platform adapters, which provide
web fallbacks. Runtime-neutral globals (timers, `crypto`, `URL`) stay unrestricted —
documented limitation, deliberate.

## Consequences

- Every native/browser capability has one audit point (the native security audit cites
  this as its key mitigation) and one mock seam for tests.
- Storage policy decisions (e.g. future encryption of local mode) become one-directory
  changes.
- `src/main.tsx` keeps its bootstrap `document.getElementById` (exempt bootstrap file).
- Modules can never fork behavior by runtime ad hoc; they ask platform, which answers
  consistently.

## Enforcement

`architecture/no-browser-globals-outside-platform` and
`architecture/no-env-outside-environment` at error severity; e2e (pure web) proves the
fallback path on every PR; Android smoke via `npm run cap:run:android` for device paths.
