# Skill: start and maintain a target-version branch

Use this skill whenever creating, checking out, committing to, or pushing a release/version branch.

## Required reading

- [../rules/versioning.md](../rules/versioning.md)
- [versioning/SKILL.md](versioning/SKILL.md)
- [../rules/20-release-gates.md](../rules/20-release-gates.md)

## Branch naming

A target version is derived only from one of these explicit forms:

- `1.7.0`
- `release/1.7.0`
- `version/1.7.0`
- `1.7.0/<feature-name>`
- `release/1.7.0/<feature-name>`

Ordinary feature branches do not silently change the release version.

## Start workflow

1. Start from the latest intended base branch with a clean working tree.
2. Create the version branch using one of the supported names.
3. The Husky `post-checkout` hook runs `npm run release:start`.
4. If hooks are unavailable or the branch was created remotely, run the command manually:

```bash
npm run release:start
```

5. Review the synchronized files before coding:
   - `package.json`
   - `functions/package.json`
   - root/functions package-lock metadata
   - `android/app/build.gradle`
   - `CHANGELOG.md`
   - `release-notes/vX.Y.Z.md`
6. Commit the version-start change separately before product implementation.

## Commit and push enforcement

- Pre-commit runs `npm run release:branch-check` before lint-staged.
- Pre-push runs `npm run release:branch-check` before typecheck and tests.
- CI verifies root, Functions, Android, changelog, release notes, and that a pull request version is strictly greater than the base branch version.
- A mismatch blocks the commit, push, or pull request; do not bypass hooks.

## Build versions versus source versions

The committed source version remains stable Semantic Versioning, for example `1.7.0`.

Every green non-main branch push produces an immutable prerelease APK version:

```text
1.7.0-dev.<github-run-number>
```

The commit SHA is also included in the APK file name and prerelease tag. This supplies a unique build for every validated push without CI creating self-triggering version commits or polluting history.

`main` keeps its existing green-gate release flow. Stable tags remain `vX.Y.Z` and must point to the exact source version.

## Forbidden shortcuts

- Creating a version branch without synchronizing its source version.
- Hand-editing only one derived version.
- Using an artifact prerelease version as the committed package version.
- Letting CI commit version bumps back to the same branch.
- Publishing an APK before every required gate succeeds.
- Reusing an Android `versionCode` or release tag.
- Bypassing Husky or release-integrity checks.

## Validation

```bash
npm run release:branch-check
npm run quality:release
npm run lint
npm run typecheck
npm run typecheck:tsc
npm run test
npm run build
```

The branch continuous-release workflow performs the full repository and Android ladder before creating its prerelease.

## Definition of done

- Branch name and source version agree.
- Root, Functions, Android, changelog, and release notes agree.
- Version start is an intentional reviewed commit.
- The pull request version exceeds its base.
- Every published branch APK is tied to a unique green commit and checksum.
