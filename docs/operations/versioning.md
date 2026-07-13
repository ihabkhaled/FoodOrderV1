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

- `package.json` `version`
- `android/app/build.gradle` — `versionName` (= semver) and `versionCode` (auto-incremented integer)
- `CHANGELOG.md` — a new dated section
- `release-notes/vX.Y.Z.md` — scaffolded if missing

## Full flow

Follow the **`skills/versioning`** skill: green gates → bump → write notes → commit → tag →
build APK from the tag → push → `gh release` with APK + SHA-256. iOS artifacts are produced on
macOS separately (see [platform-support.md](platform-support.md)).

## Rules of the road

- Never hand-edit a derived version — run `tools/release/bump-version.mjs`.
- `versionCode` is monotonic: never reused or decreased.
- The released APK is built from the exact tagged commit; its SHA-256 is recorded.
- No release with a red gate.
