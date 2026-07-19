---
id: SKILL-VERSIONING
name: versioning
title: Version branch, bump, and release
type: skill
authority: canonical
status: active
owner: release-owner
audience: [engineer, ai-agent, release-manager]
description: >
  Start or verify a target-version branch, synchronize every derived version, run the complete release ladder, tag the exact green commit, build its APK, and publish a checksum-verified release.
lastVerified: 2026-07-18
generated: false
---

# Skill: version branch, bump, and release

Use this skill with [rules/versioning.md](../../rules/versioning.md). Use [../start-version-branch.md](../start-version-branch.md) when creating or checking out a version branch.

## 0. Identify the release stream

- **New feature/version branch:** synchronize the target stable version before implementation with `npm run release:start`; a PR must remain strictly above `main`.
- **Push to `main`:** CI produces `X.Y.Z-<run_number>` and an APK/release without mutating `package.json`.
- **Push to a non-main branch:** after all mandatory gates, CI may produce `X.Y.Z-dev.<run_number>` from the exact commit.
- **Stable `X.Y.Z`:** use the final tag flow below.

## 1. Decide and verify the bump

Prompt density controls patch, minor, or major. Mixed scope takes the highest level. Additive migration may remain minor only when old data and clients remain supported.

```bash
npm run release:branch-check
npm run quality:release
```

Root and Functions manifests and locks, Android source version, changelog, and release notes must agree. On a pull request, the branch version must be greater than the base.

## 2. Synchronize only when needed

```bash
npm run release:patch -- "summary"
npm run release:minor -- "summary"
npm run release:major -- "summary"
node tools/release/bump-version.mjs 1.7.0 "summary"
```

The tool synchronizes root and Functions manifests and locks, Android `versionName` and monotonic `versionCode`, changelog, and release notes. It never commits, tags, pushes, or publishes.

## 3. Run the complete final validation

Follow [../final-validation.md](../final-validation.md) from one final tree. At minimum:

```bash
npm run knowledge:build:incremental && npm run knowledge:validate
npm run format:check
npm run lint:fix && git diff --exit-code && npm run lint
npm run typecheck && npm run typecheck:tsc
npm run test && npm run test:coverage
npm run functions:validate
npm run test:rules
npm run build
npm run quality:circular && npm run quality:dead-code
npm run quality:release && npm run quality:agent-docs
npm run test:e2e
npm run test:e2e:critical
npm run test:e2e:cross-browser
npm run security:audit
npm run cap:sync
```

Run every additional release-specific emulator, Storage-rules, accessibility, visual-regression, migration, performance, telemetry, billing, Android, and security gate. Do not proceed on red, skipped, weakened, or unexplained flaky results.

## 4. Review release evidence

- Release notes list only verified behavior.
- Migrations and rollback are documented.
- Generated `.ai/` content was produced by the knowledge tooling.
- Lint autofix leaves no diff.
- APK limitations are honest.
- The working tree contains only intended files.

## 5. Commit, tag, build, and publish

```bash
V=$(node -p "require('./package.json').version")
git add -A
git commit -m "chore(release): publish v$V"
git tag -a "v$V" -m "FoodOrderV1 v$V"
git push origin HEAD
git push origin "v$V"
```

CI must build the APK from the exact tagged commit. For a manual fallback:

```bash
npm run build
npx cap sync android
( cd android && ./gradlew lintDebug assembleDebug --no-daemon --stacktrace )
cp android/app/build/outputs/apk/debug/app-debug.apk "FoodOrderV1-v$V-debug.apk"
sha256sum "FoodOrderV1-v$V-debug.apk" | tee "FoodOrderV1-v$V-debug.apk.sha256"
gh release create "v$V" \
  "FoodOrderV1-v$V-debug.apk" \
  "FoodOrderV1-v$V-debug.apk.sha256" \
  --title "FoodOrderV1 v$V" \
  --notes-file "release-notes/v$V.md" \
  --verify-tag
```

Delete local APK artifacts after upload.

## Invariants

- Stable tag and committed stable source version match exactly.
- Every APK is built from the exact represented commit.
- `versionCode` only increases.
- SHA-256 is attached and recorded.
- Branch prereleases are never relabeled as stable.
- Native iOS validation is never claimed without macOS/Xcode evidence.
- No hook bypass, force-push over gate failure, or release from a dirty tree.
