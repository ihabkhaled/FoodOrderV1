# Platform support matrix

Owner: operations. Last updated 2026-07-13.

## Runtime / toolchain

| Component | Requirement | Notes |
|---|---|---|
| Node.js | **>= 26.0.0** (`engines.node`, `.nvmrc`, CI) | Node 26 is the current release line; it becomes Active LTS in Oct 2027. Declared as the supported floor. `npm` engine checks are advisory (not `engine-strict`), so contributors on Node 24 LTS can still run the gates with a warning while CI runs on 26. |
| npm | >= 11 | |
| `@types/node` | 26.x | matches the Node 26 runtime |
| TypeScript language target | **ES2024** (`tsconfig` `target`/`lib`, ESLint `ecmaVersion` 2024) | latest stable named ECMAScript target for type-checking and lib APIs |
| Shipped bundle syntax | `es2022` (Vite `build.target`) | intentionally below the type-level target so emitted syntax runs on the oldest supported WebViews (iOS 14 / Android 10). APIs newer than this baseline must be feature-detected, not assumed. |
| Java (Android builds) | JDK 21 (Temurin) | |
| Android SDK | compile/target 36, build-tools 35 | |

## Android

| Property | Value | Meaning |
|---|---|---|
| `minSdkVersion` | **29** | **Android 10** — the oldest supported OS. Devices on Android 9 and below are intentionally unsupported. |
| `targetSdkVersion` / `compileSdkVersion` | **36** | Android 16 — current. |
| ABIs | arm64-v8a, armeabi-v7a, x86_64 (Gradle default) | |

## iOS

| Property | Value | Meaning |
|---|---|---|
| `IPHONEOS_DEPLOYMENT_TARGET` | **14.0** | Oldest supported iOS. |
| Capacitor | 8.x | |

**iOS 13 request — documented deviation.** iOS 13 was requested, but **Capacitor 8 requires iOS 14+**
(its Swift Package template pins `.iOS(.v15)` for the runtime, and 14.0 is the documented framework
minimum). Shipping an iOS 13 floor would require downgrading to Capacitor 6, sacrificing two major
versions of native fixes and contradicting the "keep dependencies latest" mandate. Decision: keep
Capacitor 8 and set the app deployment target to **14.0**. Revisit only if a hard iOS 13 business
requirement outweighs staying current. iOS build/sign still requires macOS + Xcode (unchanged).
