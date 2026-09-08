# device

Device-level runtime state and native-capability facades: persisted user
preferences (locale/currency/theme), Capacitor native-platform detection,
haptics, status bar, push/local notification permissions and delivery, and
first-run/tour tracking.

## Responsibility

- The persisted locale/currency/theme triple every screen reads, resolved
  from stored preference or browser language on first load.
- Native/web capability adapters that degrade safely (no-op or a safe
  fallback value) rather than throw when a capability is unavailable.
- Per-page guided-tour dismissal state and the fixed set of pages that have
  a tour.
- First-run / "was this app opened before" tracking used to sequence tours
  against the notification permission prompt.

## Public exports (`@/platform/device`)

- `DEFAULT_DEVICE_CONFIG`, `DeviceConfig` (type), `loadDeviceConfig()`,
  `saveDeviceConfig(changes)`.
- `loadNotificationPromptSeen`, `saveNotificationPromptSeen`.
- `loadSidebarCollapsed`, `saveSidebarCollapsed` — device-only, never synced
  to the profile.
- `markAppOpenedAndWasReturning()`.
- `nextTheme(current)` — cycles `system → light → dark → system`.
- `SUPPORTED_CURRENCIES`, `SUPPORTED_LOCALES`, `SUPPORTED_THEMES`.
- `impact()` — a light haptic pulse, native platforms only.
- `NotificationPermissionState` (type), `queryNotificationPermission`,
  `requestNotificationPermission`.
- `initializePlatform()` — startup: native status-bar styling then service
  worker registration.
- `registerForPushNotifications`, `unregisterFromPushNotifications`,
  `subscribeToPushNotificationTaps`.
- `isNativeApplication()`, `runtimePlatformName()`.
- `clearTourDismissals`, `loadTourDismissed`, `saveAllToursDismissed`,
  `saveTourDismissed`.
- `TourPage` (type), `TOUR_PAGES` — currently `bucket-editor`,
  `bucket-share`, `buckets`, `dashboard`, `session-details`.
- `TrayNotificationRequest` (type), `showTrayNotification`,
  `subscribeToTrayNotificationTaps`.

## Structure

- `device-config.adapter.ts` — the persisted config, plus sidebar/tour
  -prompt/first-open flags; the largest file.
- `runtime-platform.adapter.ts` — the Capacitor platform-detection wrapper
  the other device files depend on.
- `haptics.adapter.ts`, `status-bar.adapter.ts`,
  `notification-permission.adapter.ts`, `push-registration.adapter.ts`,
  `tray-notification.adapter.ts` — one Capacitor plugin each, with web
  fallback/no-op behavior.
- `platform-init.adapter.ts` — composes status-bar styling + service worker
  registration into one startup call.
- `tour-flags.adapter.ts` + `tour-pages.constants.ts`.

## Dependencies

`@/platform/environment` (`env`), `@/platform/storage`, `@/platform/browser`
(language resolution, web-notification fallbacks, service worker),
`@/shared/i18n` (`resolvePreferredLocale`), `@/shared/types`,
`@/packages/{capacitor-core,capacitor-haptics,capacitor-local-notifications,
capacitor-push-notifications,capacitor-status-bar}`.

## Testing

`tests/services/deviceConfig.test.ts` (`loadDeviceConfig`,
`saveDeviceConfig`, mocking `@/platform/storage` and
`@/platform/browser/browser-language.adapter`).
