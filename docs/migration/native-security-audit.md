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
- Push notifications: none (no `@capacitor/push-notifications`); the in-app
  notification center polls Firestore. No deep links are registered
  (no custom URL scheme / intent filters beyond the Capacitor default).
- Capacitor plugins installed: app, core, haptics, keyboard, network,
  preferences, status-bar — all low-permission; no camera, geolocation,
  filesystem, or biometric surface.

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
