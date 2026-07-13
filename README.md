# FoodOrderV1

FoodOrderV1 is the completed Capacitor successor to the original React Native prototype. It lets a person create reusable food **buckets** (saved menus), choose quantities, place or save orders, track order history and status, repeat previous orders, and manage language, theme, and currency preferences — and now share buckets with other people: role-scoped invitations by join code, per-member quantity contributions with concurrency-safe aggregation, an activity timeline, and group orders that snapshot everyone's contributions.

## Product modes

- **Firebase mode:** Firebase Authentication and Cloud Firestore provide cloud identity, persistence, collaboration, and offline caching. Authorization is enforced by `firestore.rules` (schema v2, see `architecture/sharing-design.md`).
- **Local-device mode:** when Firebase environment variables are absent (or `VITE_FORCE_LOCAL_MODE=true`), the full workflow — including sharing, simulated with multiple local accounts — remains usable in browser/local storage for evaluation and development. Local mode is not cross-device and is not a production substitute.

## Runtime configuration

Language (English/Arabic with RTL), currency, and theme are **runtime settings**: defaults are seeded from `VITE_DEFAULT_LOCALE` / `VITE_DEFAULT_CURRENCY` on first launch, and every user can change them at any time from Settings (language also from the auth screen). Choices persist on the device (Capacitor Preferences) and in the signed-in profile. See `src/state/deviceConfig.ts`.

## Start

```bash
cp .env.example .env    # fill VITE_FIREBASE_* for cloud mode, or leave empty for local mode
npm install
npm run dev
```

Open `http://localhost:5173`.

## Validate

```bash
npm run knowledge:build
npm run knowledge:validate
npm run typecheck        # TypeScript 7.0.2 (primary compiler)
npm run typecheck:tsc    # TypeScript 6.0.2 (fallback compiler used by the lint toolchain)
npm run lint
npm run test             # unit + integration incl. sharing concurrency/idempotency suites
npm run test:e2e         # Playwright (forced local-device mode)
npm run build
npm run knowledge:benchmark
```

## Native platforms (committed)

The `android/` and `ios/` projects are committed and kept in sync with `npx cap sync`.

```bash
npm run build && npx cap sync   # refresh native web assets after web changes
npm run cap:open:android        # Android Studio
npm run cap:open:ios            # Xcode (macOS only)
```

### Android APK

```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Requires JDK 21 and an Android SDK (set `sdk.dir` in `android/local.properties` or `ANDROID_HOME`). CI builds the same APK via `.github/workflows/android-apk.yml`; pushing a `v*` tag attaches `FoodOrderV1-<tag>-debug.apk` + its SHA-256 to the GitHub release. The APK is debug-signed; the release-signing runbook lives in `operations/delivery-plan.md`.

### iOS

The `ios/` project (icons/splash included) is generated and synced from Windows/Linux, but compiling, signing, and running require macOS with Xcode + CocoaPods: `cd ios/App && pod install`, then open `App.xcworkspace`.

## Legacy migration

Export the original Realtime Database as JSON, configure Application Default Credentials for the target Firebase project, then run:

```bash
npm run migrate:legacy -- ./legacy-export.json --dry-run   # counts only
npm run migrate:legacy -- ./legacy-export.json             # writes schema v2
```

The migration converts `usersData/{uid}/buckets/{bucketId}` records with `inputValues` into normalized schema-v2 buckets (top-level `buckets/{id}` + owner membership). Prices default to zero because the original app did not store them. No order history is fabricated. Reruns are idempotent; the RTDB source is never modified.

## AI-native repository workflow

Read `.ai/BOOTSTRAP.md`, then resolve only the relevant context:

```bash
npm run knowledge:context -- --task="add order filtering by date"
npm run knowledge:context -- --task="change bucket validation" --files="src/lib/bucket.ts"
npm run knowledge:context -- --task="review status transition" --symbols="transitionOrder"
```

Canonical project truth lives outside `.ai/`; `.ai/` is generated and must not be edited manually.
