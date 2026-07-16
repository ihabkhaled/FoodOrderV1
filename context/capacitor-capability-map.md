# Capacitor capability map

Installed plugin set (deliberately low-permission; audit:
[../docs/migration/native-security-audit.md](../docs/migration/native-security-audit.md)):
app, core, haptics, keyboard, network, preferences, status-bar — all Capacitor 8.x.
No camera, geolocation, filesystem, biometrics, push notifications, or deep links.

## Capability → seam

| Capability               | Vendor package           | Facade                             | Platform seam          | Web fallback                         |
| ------------------------ | ------------------------ | ---------------------------------- | ---------------------- | ------------------------------------ |
| Native runtime detection | `@capacitor/core`        | `@/packages/capacitor-core`        | `src/platform/device`  | reports web                          |
| Haptic feedback          | `@capacitor/haptics`     | `@/packages/capacitor-haptics`     | `src/platform/device`  | no-op                                |
| Status bar styling       | `@capacitor/status-bar`  | `@/packages/capacitor-status-bar`  | `src/platform/device`  | no-op                                |
| Keyboard behavior        | `@capacitor/keyboard`    | reserved (EXC-2)                   | —                      | n/a (no web import sites)            |
| App lifecycle            | `@capacitor/app`         | reserved (EXC-2)                   | —                      | n/a (no web import sites)            |
| Network status           | `@capacitor/network`     | `@/packages/capacitor-network`     | `src/platform/network` | browser online/offline events        |
| Persistent preferences   | `@capacitor/preferences` | `@/packages/capacitor-preferences` | `src/platform/storage` | web storage                          |
| Clipboard / share        | (Web APIs)               | —                                  | `src/platform/browser` | navigator.clipboard/share + fallback |

Legacy seam being migrated: `src/services/platform.ts` (single file) becomes the
`src/platform/*` directories above; `src/state/deviceConfig.ts` (locale/currency/theme
persistence) feeds `src/platform/storage` + the session module.

## Configuration facts (verified)

- `capacitor.config.ts`: no `server.url` override — production WebView loads bundled
  assets only.
- Production bundle ships without sourcemaps (deliberate: APK size + source exposure).
- Auth tokens live in the Firebase SDK's IndexedDB persistence, not app-written storage.
- Local-device mode persists to storage unencrypted by design (single-device, user's own
  bucket data).
- E2E never runs native: `VITE_FORCE_LOCAL_MODE=true`, pure web.

## Workflows

- New capability: [../skills/add-capacitor-plugin.md](../skills/add-capacitor-plugin.md)
  (registry + facade + platform adapter + audit update).
- Sync shells after web changes: `npm run cap:sync`; Android smoke:
  `npm run cap:run:android`.
- iOS: committed but unvalidated — no macOS available (EXC-5). Never claim otherwise.
