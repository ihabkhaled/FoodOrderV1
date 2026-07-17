# Native platform pitfalls

Windows/Android/iOS specifics for this repo. Audit of record:
[../docs/migration/native-security-audit.md](../docs/migration/native-security-audit.md).

## Windows development host

- Worktrees show CRLF phantom diffs; never commit line-ending churn (see
  [known-pitfalls.md](known-pitfalls.md)).
- Gradle from the repo: run `./gradlew` from inside `android/` (Git Bash) or `gradlew.bat`
  (PowerShell); the versioning skill's commands assume a POSIX shell.
- Local Android toolchain paths are machine-specific (SDK via Android Studio); nothing in
  the repo may hardcode them.

## Android

- `android/` is committed. `npm run cap:sync` (build + `cap sync`) regenerates the web
  asset copy; commit the resulting diff. A stale sync ships old web code in the APK.
- `android/app/build.gradle` `versionName`/`versionCode` are DERIVED — only
  `npm run release:*` touches them; `versionCode` is monotonic, never reused.
- CI builds a debug APK on main/tags (`android-apk.yml`), verifies SHA-256, and attaches
  both to the GitHub release; the APK must come from the exact tagged commit.
- New plugins can add manifest permissions silently — review the `android/` diff after
  every `cap sync` with a new plugin.
- WebView loads bundled assets only (no `server.url` in `capacitor.config.ts`); adding a
  dev-server URL for debugging and committing it is a security regression.

## iOS

- `ios/` project (CapApp-SPM) is committed and version-synced, but **no macOS environment
  exists for this repo** — builds, entitlements, and ATS cannot be validated here (EXC-5).
- Never claim iOS validation in PRs, release notes, or docs. iOS-affecting changes are
  recorded as "pending macOS verification" in the native audit.
- Before any real iOS release: `cap sync ios` + Xcode audit on macOS (owner: repo owner).

## Capacitor general

- Plugins must stay major-aligned with `@capacitor/core` 8.x (CLI and platform packages
  too); mixed majors fail at `cap sync`, not install time.
- Every native capability needs a web fallback — e2e runs pure web and gates every PR.
- `@capacitor/app` and `@capacitor/keyboard` are installed for the native runtime but have
  zero web import sites (EXC-2) — importing them in web code requires creating their owner
  facades first.
- Haptics/status-bar failures are ignorable no-ops on web; network/preferences failures
  are NOT (they back real behavior) — do not blanket-catch platform adapters.
