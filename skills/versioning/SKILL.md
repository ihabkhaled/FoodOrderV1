---
id: SKILL-VERSIONING
name: versioning
title: Version bump and release
type: skill
authority: canonical
status: active
owner: release-owner
audience: [engineer, ai-agent, release-manager]
description: >
  Bump the app version (prompt-density decides patch/minor/major), sync every derived version,
  write changelog + release notes, then commit, tag, build the APK, and publish a GitHub release.
lastVerified: 2026-07-18
generated: false
---

# Skill: versioning — bump & release

Use this whenever a change is ready to ship. It enforces [rules/versioning.md](../../rules/versioning.md).

## 0. Automated streams — know which path you are on

CI automates two version streams (details in
[docs/operations/versioning.md](../../docs/operations/versioning.md)):

- **Cut a branch off `main`** → bump MINOR **first**, before any work is reviewed:
  `npm run release:minor -- "what this branch does"` (syncs package.json + functions +
  gradle), commit it. The PR's `release-integrity` gate fails until `version` is above
  `main`. Patch/major instead per prompt density.
- **Push to `main`** → CI auto-builds and releases `X.Y.Z-<run_number>` (APK + GitHub
  release) with no `package.json` change. You do nothing.
- **Ship a clean `X.Y.Z`** → the manual tag flow below (steps 1–4).

## 1. Decide the bump (prompt density)

Read the driving prompt and classify (see the rule for the table):

- localized fix / copy / style / docs → **patch**
- new feature / flow / UX overhaul (backward-compatible) → **minor**
- breaking schema / contract / rules / architecture → **major**

Mixed → take the highest. Unsure → the higher one, and say why in the notes.

## 2. Ensure gates are green

```bash
npm run lint && npm run typecheck && npm run test && npm run build
npm run test:e2e            # UI/flow gate
```

Do not proceed on any red gate.

## 3. Bump (single command)

```bash
npm run release:patch -- "summary of the change"
# or release:minor / release:major, or an explicit version:
node tools/release/bump-version.mjs 1.2.3 "summary"
```

This updates `package.json`, `android/app/build.gradle` (versionName + versionCode+1),
`CHANGELOG.md`, and scaffolds `release-notes/vX.Y.Z.md`. Then flesh out the release notes file.

## 4. Commit, tag, build APK, release

```bash
V=$(node -p "require('./package.json').version")
git add -A && git commit -m "Release v$V"
git tag -a "v$V" -m "FoodOrderV1 v$V"

# Build the APK from the tagged commit
npm run build && npx cap sync android
( cd android && ./gradlew assembleDebug )
cp android/app/build/outputs/apk/debug/app-debug.apk "FoodOrderV1-v$V-debug.apk"
sha256sum "FoodOrderV1-v$V-debug.apk" | tee "FoodOrderV1-v$V-debug.apk.sha256"

git push origin main && git push origin "v$V"
gh release create "v$V" "FoodOrderV1-v$V-debug.apk" "FoodOrderV1-v$V-debug.apk.sha256" \
  --title "FoodOrderV1 v$V" --notes-file "release-notes/v$V.md" --verify-tag
rm "FoodOrderV1-v$V-debug.apk" "FoodOrderV1-v$V-debug.apk.sha256"   # artifacts live on the release, not the repo
```

## Invariants

- APK is built from the exact tagged commit.
- `versionCode` only ever increases.
- SHA-256 recorded in the release notes and attached as an asset.
- Never leave build artifacts (`*.apk`) committed to the repo.
