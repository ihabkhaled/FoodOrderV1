---
id: SKILL-VERSIONING
name: versioning
title: Final stable version and release
type: skill
authority: canonical
status: active
owner: release-owner
audience: [engineer, ai-agent, release-manager]
description: >
  Finalize a stable source version, synchronize every derived version, run the complete release ladder, tag the exact green commit, build its APK, and publish the checksum-verified GitHub release.
lastVerified: 2026-07-18
generated: false
---

# Skill: final stable version and release

Use this skill when a version branch is ready to become a stable release. Use [../start-version-branch.md](../start-version-branch.md) when creating or checking out the branch.

## 1. Confirm the bump

Read the driving prompt and [../../rules/versioning.md](../../rules/versioning.md).

- localized fix/copy/style/docs → patch;
- backward-compatible feature/flow/UX → minor;
- incompatible public schema/contract/API → major.

Mixed scope takes the highest level. Additive migration may stay minor only when old data and clients remain supported.

## 2. Confirm branch and source version

```bash
npm run release:branch-check
npm run quality:release
```

The version branch, root manifest, Functions manifest, Android source version, changelog, and release notes must agree. A pull request must be greater than its base.

Development APKs such as `1.7.0-dev.42` are immutable CI artifacts; they are not committed source versions and are not stable tags.

## 3. Execute complete final validation

Follow [../final-validation.md](../final-validation.md) from the final tree. Every mandatory and release-specific gate must pass in one final state.

At minimum:

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

Run every additional gate introduced by the release, including emulator-integrated, Storage rules, accessibility, visual, migration, performance, telemetry, or billing tests.

Do not proceed on any red, skipped, weakened, or unexplained flaky gate.

## 4. Synchronize only when the target is not already set

For a new target:

```bash
node tools/release/bump-version.mjs 1.7.0 "high-impact product release"
```

The tool synchronizes:

- `package.json`;
- `functions/package.json`;
- root/functions package-lock metadata;
- Android `versionName` and monotonic `versionCode`;
- `CHANGELOG.md`;
- `release-notes/vX.Y.Z.md`.

Never hand-edit only one derived version.

## 5. Review release evidence

Before the release commit:

- release notes list only verified shipped behavior;
- migrations and rollback are documented;
- APK limitations are honest;
- scorecard/evidence is complete;
- no generated `.ai/` file was hand-edited;
- `git status` contains only intended files;
- lint autofix produces no uncommitted diff.

## 6. Commit, tag, build, and publish

```bash
V=$(node -p "require('./package.json').version")
git add -A
git commit -m "chore(release): publish v$V"
git tag -a "v$V" -m "FoodOrderV1 v$V"

git push origin HEAD
git push origin "v$V"
```

CI must build the APK from the exact tagged commit. Verify the attached file and checksum. When a manual fallback is required:

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

Delete local APK artifacts after upload; they never belong in the repository.

## Invariants

- The stable tag equals the stable source version exactly.
- The APK is built from the exact tagged commit.
- `versionCode` only increases.
- SHA-256 is attached and recorded.
- Branch prereleases are never relabeled as stable.
- Native iOS validation is never claimed without an executed macOS/Xcode run.
- No hook bypass, force-push over gate failure, or release from a dirty tree.
