# Notifications: what ships today and what remote push would need

Governance-Version: 1

Owner: release-owner · Last verified: 2026-07-30 (v1.8.0)

## What ships in v1.8.0

FoodOrderV1 mirrors its **in-app** notification centre into the operating
system's notification tray. Nothing new is sent over the network: the tray entry
is drawn from a notification the backend had already delivered to the
signed-in user.

| Concern | Implementation |
| --- | --- |
| Permission query/request | `src/platform/device/notification-permission.adapter.ts` |
| Raising a tray notification | `src/platform/device/tray-notification.adapter.ts` |
| Browser API wrapper | `src/platform/browser/web-notification.adapter.ts` |
| Native plugin facade | `src/packages/capacitor-local-notifications/` |
| Which notifications mirror | `src/app/shell/helpers/notification-mirror.helper.ts` |
| Wiring + tap routing | `src/app/shell/hooks/use-app-layout.hook.ts` |

Behaviour that is deliberate:

- The **first** subscription payload is treated as history. Without this, every
  sign-in would replay the whole inbox into the tray.
- Mirroring is **suppressed while the app is in front** (`document.hidden`), so
  users are not notified twice about something already on screen.
- The OS prompt is only raised from a **deliberate user action** — a one-time
  in-app explainer, or the Notifications control in
  Settings → Preferences. It never fires on page load.
- Declining is remembered per device (`ui:notification-prompt-seen`); the
  Settings control remains available afterwards.
- Every adapter degrades to a no-op and reports `unsupported`/`false` rather
  than throwing, so an unavailable API can never break an ordering action.

### Limits

This is **foreground/backgrounded-tab mirroring, not remote push**. When the web
app is fully closed, or the native app has been terminated, no notification is
delivered, because nothing is running to receive it. Delivering in that state
requires remote push (below).

iOS ships in `Package.swift` but **cannot be validated in this repository** — no
macOS/Xcode environment exists (EXC-5). Treat iOS notification behaviour as
unverified until someone runs it on an Apple device.

## Remote push (FCM) — implemented in v1.8.0

Native devices now register with FCM and the server pushes to them, so a
**closed** app still receives order rounds, invitations, and status changes.

| Concern | Implementation |
| --- | --- |
| Plugin facade | `src/packages/capacitor-push-notifications/` |
| Register / unregister / tap routing | `src/platform/device/push-registration.adapter.ts` |
| Shell wiring | `src/app/shell/hooks/use-app-layout.hook.ts` |
| Token persistence contract | `NotificationService.savePushToken / removePushToken` |
| Callables | `savePushTokenV180`, `removePushTokenV180` (`functions/src/notifications.ts`) |
| Server fan-out | `pushToDevices()` in `functions/src/notificationCore.ts` |
| Rules | `users/{uid}/pushTokens/{token}` is `allow read, write: if false` |

Design notes:

- Tokens are stored at `users/{uid}/pushTokens/{token}` — the document id *is*
  the token, so re-registration on every launch is naturally idempotent, and
  the subcollection is removed with the account by the existing data cascade.
- Clients can never read or write tokens; only trusted callables do. Covered by
  `tests/firebase/firestore.rules.test.ts`.
- `pushToDevices()` sits inside the single chokepoint every notification already
  passes through, so no producer needed changing.
- Sends are best-effort: a messaging failure never fails the caller, because
  the stored in-app notification remains the source of truth.
- Tokens rejected as unregistered or invalid are pruned automatically from the
  send response, so dead devices do not accumulate.
- Web registration is deliberately excluded from this adapter: browser push
  needs an FCM service worker plus the VAPID exchange. The key is already wired
  as `env.webPushPublicKey`; the remaining work is the service worker.

### Owner setup still required

1. **Android** — download `google-services.json` for package
   `com.ihabkhaled.foodorderv1` into `android/app/` (gitignored). For CI, store it
   base64-encoded as the `GOOGLE_SERVICES_JSON` GitHub secret; the APK workflow
   restores it and skips push cleanly when it is absent.
2. **iOS** — APNs auth key uploaded to Firebase, `GoogleService-Info.plist`, the
   Push Notifications capability, and `UIBackgroundModes: remote-notification`.
   Requires macOS/Xcode and cannot be validated here (EXC-5).
3. **Web** — add an FCM service worker before offering browser push.

## Historical: what remote push required before v1.8.0


These are **owner actions outside the repository**; none of them can be created
from source, which is why v1.8.0 stops short of remote push.

1. **Web (FCM + VAPID)**
   - **Done in v1.8.0:** the Web Push certificate key pair exists, and
     `VITE_FIREBASE_VAPID_KEY` is wired through `.env`, `.env.example`,
     `src/platform/environment` (`env.webPushPublicKey` /
     `env.webPushConfigured`), and the Android APK workflow. Set the same
     repository variable in GitHub and in the Vercel project environment.
     The stored value is the **public** half; the private key never leaves
     Firebase.
   - Register `firebase-messaging-sw.js` at the origin root (or add `push` and
     `notificationclick` listeners to the existing `public/sw.js` and bump its
     `CACHE_NAME`). Note `registerServiceWorker` currently only runs in
     production builds, so web push will not work in `npm run dev` until that
     guard is relaxed.
   - `firebase` already bundles `@firebase/messaging`, so **no new npm
     dependency is needed** — only a facade export from `@/packages/firebase`.

2. **Android**
   - Add `google-services.json` to `android/app/` (gitignored; supplied per
     environment) and the Google Services Gradle plugin.
   - Install `@capacitor/push-notifications` following
     `skills/add-capacitor-plugin.md` (registry entry before first import).

3. **iOS**
   - APNs authentication key uploaded to Firebase, `GoogleService-Info.plist`,
     the Push Notifications capability, `aps-environment` entitlement, and
     `UIBackgroundModes: remote-notification`. Requires macOS/Xcode (EXC-5).

4. **Server fan-out**
   - Store FCM registration tokens under a new per-user subcollection with its
     own `firestore.rules` block (mirror the closed `notifications` pattern:
     `allow read, write: if false`, callable-only writes).
   - Send from the single existing chokepoint in
     `functions/src/notificationCore.ts` (`writeNotification` /
     `writeNotifications`) via `getMessaging().sendEachForMulticast()`.
     `firebase-admin` is already a dependency.
   - Decide and document token lifecycle: refresh, per-device revocation on
     sign-out, and pruning of unregistered tokens.

## Verification performed for v1.8.0

- Unit: permission/tray adapter fallbacks and the mirroring selection helper.
- e2e (Chromium): permission granted via `context.grantPermissions`, a seeded
  notification raises exactly one tray entry, and no entry is raised while the
  page is visible.
- Cross-browser: the feature degrades silently; the existing suites stay green.
- Android: Gradle wiring diff reviewed and committed; `POST_NOTIFICATIONS` is
  contributed by the plugin's library manifest through manifest merging.
- iOS: not validated (EXC-5).
