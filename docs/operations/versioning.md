# Versioning & releases

FoodOrderV1 follows [Semantic Versioning](https://semver.org). One place-of-record
(`package.json` `version`) drives every derived version. The **bump level is chosen by prompt
density** — how large the requested change is (see [rules/versioning.md](../../rules/versioning.md)).

## Quick reference

| You changed… | Bump | Command |
|---|---|---|
| a label, margin, copy, one small fix, docs | patch | `npm run release:patch -- "…"` |
| a new feature / flow / screen / UX overhaul | minor | `npm run release:minor -- "…"` |
| schema / contract / rules / architecture (breaking) | major | `npm run release:major -- "…"` |

Example progression: `1.0.0 → 1.0.1 → 1.0.2 → 1.1.0 → 2.0.0`.

## What a bump touches

- `package.json` `version` (the place-of-record)
- `functions/package.json` `version` — kept equal to root (`quality:release` enforces this)
- `android/app/build.gradle` — `versionName` (= semver) and `versionCode` (auto-incremented integer)
- `CHANGELOG.md` — a new dated section
- `release-notes/vX.Y.Z.md` — scaffolded if missing

## Automated versioning in CI

Two version streams run automatically — you rarely bump `package.json` by hand except when
starting a branch.

### Push to `main` → build number `X.Y.Z-<run>`, auto release + APK

Every push to `main` triggers a full build and release **without touching `package.json`**:

- `android-apk.yml` resolves a **build version** = `<package.json version>-<github.run_number>`
  (e.g. `1.6.0-42`), overrides the Android `versionName` for that build only, and produces
  `FoodOrderV1-v<build>-<sha7>-debug.apk` (+ `.sha256`).
- `release-apk` publishes GitHub release **`v<build>`** with the APK attached.
- `package.json` stays at the clean `X.Y.Z`; the build number is a CI artifact stamp, not a
  source change (so there is no bot commit and no CI loop).
- Pushing a real annotated tag `vX.Y.Z` instead releases the clean `X.Y.Z`.

Run number is monotonic, so builds sort naturally: `1.6.0-41`, `1.6.0-42`, `1.6.0-43`, …

### New branch / PR → bump MINOR before merge (enforced)

When you cut a feature branch off `main` (currently `1.6.0`), **bump the minor version first**:

```bash
git switch -c feature/whatever
npm run release:minor -- "what this branch does"   # 1.6.0 -> 1.7.0, syncs functions + gradle
git commit -am "chore(release): bump to 1.7.0"
```

The `release-integrity` CI job resolves `BASE_VERSION` from `main` and `npm run quality:release`
**fails the PR** until `package.json` `version` is strictly greater than main's. New feature
branches bump MINOR by default; use `release:patch`/`release:major` per the density table when
that fits better. On merge to `main`, the build-number stream above takes over for day-to-day
builds until the next branch bumps the base again.

### Cheat sheet

| Event | Version used | Where |
|---|---|---|
| Push to `main` | `X.Y.Z-<run>` | APK name, versionName, GitHub release tag |
| Open/adv. a PR | must be `> main` (MINOR default) | `package.json` (enforced by `quality:release`) |
| Push tag `vX.Y.Z` | `X.Y.Z` (clean) | release tag = the git tag |

## Full flow

Follow the **`skills/versioning`** skill: green gates → bump → write notes → commit → tag →
build APK from the tag → push → `gh release` with APK + SHA-256. iOS artifacts are produced on
macOS separately (see [platform-support.md](platform-support.md)).

## Rules of the road

- Never hand-edit a derived version — run `tools/release/bump-version.mjs`.
- `versionCode` is monotonic: never reused or decreased.
- The released APK is built from the exact tagged commit; its SHA-256 is recorded.
- No release with a red gate.
