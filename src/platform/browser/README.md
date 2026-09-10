# browser

Sole owner of `window`/`document`/browser-global touchpoints, so the rest of
the app never reaches for a browser global directly.

## Responsibility

- Theme and locale application on `<html>` (`data-theme`, `lang`, `dir`), and
  OS color-scheme change tracking.
- The `/xx` URL locale-prefix scheme: stripping, rewriting, matching.
- Clipboard, native share, and client-side file download.
- Document visibility, pointer-down listening, viewport scroll position, and
  element bounding-box measurement (used by the guided-tour spotlight).
- Web `Notification` API access, degrading to a safe value rather than
  throwing when unsupported.
- The public marketing site's own theme choice — deliberately separate
  storage and state from the signed-in app's theme.
- Service worker registration (production builds only) and an in-tab
  pub/sub event bus.

## Public exports (`@/platform/browser`)

- `applyDocumentTheme`, `subscribeToColorSchemeChange`, `applyDocumentLocale`,
  `getDocumentLanguage`, `ThemePreference` (type).
- `navigateToBrowserLocale`, `buildBrowserLocalePath`,
  `hasBrowserLocalePrefix`, `getBrowserLanguages`.
- `getBrowserBootstrapContext`, `replaceBrowserPath`,
  `BrowserBootstrapContext` (type).
- `copyToClipboard`, `shareText`, `downloadTextFile`, `getApplicationBaseUrl`.
- `subscribeToPointerDown`, `isDocumentHidden`, `getViewportScrollTop`,
  `scrollViewportToTop`.
- `measureElementRect`, `prefersReducedMotion`, `subscribeToViewportChanges`,
  `ElementRect` (type).
- `queryWebNotificationPermission`, `requestWebNotificationPermission`,
  `showWebNotification`.
- `applyPublicTheme`, `loadPublicThemeChoice`, `resolvePublicTheme`,
  `savePublicThemeChoice`, `PUBLIC_THEME_STORAGE_KEY`,
  `PublicThemeChoice` (type).
- `registerServiceWorker`.
- `dispatchAppEvent`, `subscribeToAppEvent`.

## Structure

- Document/DOM: `document-events`, `document-settings` (+ `.types`),
  `document-visibility`, `bootstrap-document`, `element-rect`,
  `viewport-scroll`.
- Locale-path: `browser-locale-path.constants` (the prefix regex),
  `browser-locale-path.helper`, `browser-locale-navigation`,
  `browser-language`.
- Theming: `document-settings` (signed-in app) vs `public-theme` (marketing
  site — separate storage/state on purpose).
- Browser capabilities: `clipboard`, `share`, `file-download`,
  `web-notification`, `location-origin`.
- App plumbing: `app-events` (in-tab event bus), `service-worker`.

## Dependencies

`@/platform/environment` (`isProdBuild`), `@/shared/types` (`Locale`). No
`@/packages/*` imports — raw browser globals only.

## Testing

`tests/domain/browser-locale-path.test.ts`, `tests/i18n/locale-runtime.test.ts`,
`tests/services/deviceConfig.test.ts` (mocks `browser-language.adapter`).
