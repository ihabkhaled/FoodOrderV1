# Native / Capacitor Security Audit (v1.6.0)

Environment note: this migration ran on Windows; Android checks that require
the local SDK are runnable, iOS build validation is not (no macOS). CI builds
the Android APK on every main merge; iOS remains a documented gap.

## Configuration facts (verified in-repo)

- `capacitor.config.ts`: no `server.url` override — production WebView loads
  bundled assets only; no cleartext/dev-server leak vector.
- Production web bundle ships without sourcemaps (vite config, deliberate:
  they would double the APK and expose readable source).
- Firebase configuration enters only via `VITE_FIREBASE_*` env at build time;
  no secrets in source (Trivy secret scan is a CI gate).
- E2E runs force `VITE_FORCE_LOCAL_MODE=true` — tests never touch live
  Firebase.
- Auth tokens are held by the Firebase SDK (IndexedDB persistence), not by
  app-written `localStorage`.
- Local-device mode stores its database in `localStorage` unencrypted by
  design: it is a single-device, no-account mode holding the user's own food
  bucket data (no PHI, no payment data, no third-party PII).
- Remote push notifications: IMPLEMENTED in v1.8.0 via @capacitor/push-notifications; tokens live in users/{uid}/pushTokens (callable-only, closed to clients) and are pruned when FCM reports them unregistered. Requires google-services.json (Android, gitignored) and APNs assets (iOS, unvalidated per EXC-5). Historical note: previously none (no `@capacitor/push-notifications`, no FCM
  registration, no VAPID key, no `google-services.json`); the in-app
  notification center polls Firestore. No deep links are registered
  (no custom URL scheme / intent filters beyond the Capacitor default).
  Prerequisites for future remote push:
  [../operations/push-notifications.md](../operations/push-notifications.md).
- Local (on-device) notifications: added in v1.8.0 via
  `@capacitor/local-notifications` so in-app notifications mirror into the OS
  tray while the app is backgrounded. Raised only from notifications the server
  already delivered to this signed-in user; no new data leaves the device.
- Capacitor plugins installed: app, core, haptics, keyboard,
  local-notifications, network, preferences, status-bar — no camera,
  geolocation, filesystem, or biometric surface.
- Android permission surface expanded in v1.8.0. The local-notifications
  library manifest merges three permissions into the app at build time
  (`POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`) plus three
  receivers (timed publisher, dismiss receiver, boot restore). Because they
  arrive through manifest merging, `android/app/src/main/AndroidManifest.xml`
  is unchanged in git; only the Gradle wiring diff is committed.
  `POST_NOTIFICATIONS` is runtime-prompted on Android 13+ and is never
  requested without a deliberate user action.
- iOS: the plugin ships in `Package.swift`, but no macOS/Xcode environment
  exists for this repository (EXC-5). iOS notification behavior is
  **unvalidated** and must not be claimed.

## Actions in this migration

- Browser/native access centralized in `src/platform` (mechanically
  enforced), so future storage decisions have one audit point.
- Environment reads centralized in `src/platform/environment` (enforced).
- `npm audit --audit-level=high` (root + functions) and Trivy
  (vuln/secret/misconfig, HIGH/CRITICAL, fail-closed) remain CI gates.

## Open items

- iOS entitlement/ATS validation requires a macOS environment (owner: repo
  owner; remediation: run `cap sync ios` + Xcode audit on macOS before an iOS
  release).
- Android `android/` project audit (exported components, backup policy) is
  covered implicitly by the default Capacitor template; explicit manifest
  lint remains a follow-up in the release checklist.
