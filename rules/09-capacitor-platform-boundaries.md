# 09 — Capacitor and platform boundaries

## Rule

All environment-dependent capabilities — browser globals, device features, network status,
storage, env configuration — are accessed only through `src/platform` adapters. Capacitor
plugin APIs are accessed only through their `src/packages/capacitor-*` facades, consumed by
`src/platform`, never by modules directly.

## Motivation

The app runs in three runtimes: desktop browser, Android WebView (Capacitor), and Playwright
(local mode). A single platform seam makes runtime differences testable and auditable — the
native security audit has one place to look
([../docs/migration/native-security-audit.md](../docs/migration/native-security-audit.md)).

## Required

- `src/platform/environment`: the only reader of `import.meta.env` / `process.env`;
  validates `VITE_FIREBASE_*`, `VITE_FORCE_LOCAL_MODE`, `VITE_APP_NAME`,
  `VITE_DEFAULT_LOCALE`, `VITE_DEFAULT_CURRENCY` once and exposes a typed `env`.
- `src/platform/browser`: DOM/document/window concerns (theme/lang/dir attributes,
  listeners, clipboard/share with web fallbacks).
- `src/platform/device`: Capacitor-backed device capabilities (haptics, status bar,
  keyboard behavior) with web no-op fallbacks.
- `src/platform/network`: online/offline status (`@capacitor/network` + browser events).
- `src/platform/storage`: persistent key-value storage backing local-device mode.
- Installed plugin set (low-permission by audit): app, core, haptics, keyboard, network,
  preferences, status-bar. Adding one follows
  [../skills/add-capacitor-plugin.md](../skills/add-capacitor-plugin.md).
- After web changes that affect native shells: `npm run cap:sync`.

## Forbidden

- `window`, `document`, `navigator`, `localStorage`, `sessionStorage`, `matchMedia`,
  `history`, `location` outside `src/platform`.
- Raw `@capacitor/*` imports outside `src/packages/capacitor-*`.
- New plugins with camera/geolocation/filesystem/biometric permissions without a security
  review and an updated native audit.
- A `server.url` override in `capacitor.config.ts` (production WebView loads bundled assets
  only); enabling sourcemaps in the production bundle.
- Claiming iOS validation — no macOS environment exists (EXC-5).

## Enforcement

- `architecture/no-browser-globals-outside-platform`,
  `architecture/no-env-outside-environment`, `architecture/no-raw-package-imports` (error).
- Trivy + `npm run security:audit` gate the dependency surface; CI builds the Android APK.

## Definition of done

No browser global or raw plugin import outside the boundary; web fallback behavior covered
by e2e (which runs pure-web local mode); Android smoke run for device-facing changes
(`npm run cap:run:android`); native audit updated when the plugin set or config changed.
