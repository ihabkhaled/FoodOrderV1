# 20 — Release gates

## Rule

Nothing merges to `main` unless every CI job in `.github/workflows/ci.yml` is green — the
`all-gates-green` job enforces the full set mechanically. Nothing releases without the
versioning flow in [versioning.md](versioning.md) / [../skills/versioning/SKILL.md](../skills/versioning/SKILL.md).

## Motivation

`main` deploys: a push triggers Firebase Functions + Firestore rules deployment, callable
smoke tests, an Android APK build, and a GitHub release. A red gate on `main` is a
production incident path, not a formality.

## Required

The mandatory gate set (all must succeed):

| Gate                               | Command / job                                        |
| ---------------------------------- | ---------------------------------------------------- |
| Knowledge build/validate/benchmark | `npm run knowledge:build`, `knowledge:validate`      |
| Format                             | `npm run format:check`                               |
| Lint (autofix diff + clean run)    | `npm run lint:fix` (zero diff) then `npm run lint`   |
| Typecheck primary (TS 7.0.2)       | `npm run typecheck`                                  |
| Typecheck compatibility (TS 5.9.3) | `npm run typecheck:tsc`                              |
| Functions build + tests (Node 22)  | `npm run functions:validate`                         |
| Release version integrity          | `npm run quality:release` (root = functions version) |
| Firestore rules (emulator)         | `_firebase-emulator.yml` / `npm run test:rules`      |
| Circular deps                      | `npm run quality:circular`                           |
| Dead code                          | `npm run quality:dead-code`                          |
| Coverage                           | `npm run test:coverage`                              |
| Production build                   | `npm run build`                                      |
| E2E + critical e2e                 | `npm run test:e2e`, `npm run test:e2e:critical`      |
| npm audit (root + functions)       | `npm run security:audit`                             |
| Trivy (HIGH/CRITICAL, fail-closed) | CI `trivy` job                                       |

- Local hooks mirror CI: husky pre-commit (lint-staged eslint --fix), pre-push
  (typecheck + test), commit-msg (commitlint conventional commits).
- Releases: bump via `npm run release:patch|minor|major` (syncs `package.json`,
  `android/app/build.gradle` versionName/versionCode, `CHANGELOG.md`, scaffolds
  `release-notes/vX.Y.Z.md`); annotated tag `vX.Y.Z`; APK built from the exact tagged
  commit with SHA-256 attached. Bump level by prompt density (see
  [versioning.md](versioning.md)).
- Governance docs integrity: `node scripts/check-agent-docs.mjs` passes.

## Forbidden

- Merging with any red gate; retrying flakes into green without diagnosing.
- `--no-verify`, hook bypasses, force-pushes over gate failures.
- Hand-editing derived versions (gradle versionName/versionCode, docs) — run the tool.
- Claiming release readiness with unexecuted evidence (e.g. iOS, see EXC-5) or open
  production blockers.

## Enforcement

- `all-gates-green` requires every job's success; `firebase-deploy`, `generate-apk`,
  `release-apk` chain off it. Branch work happens in worktrees/PRs, never directly on a red
  `main`.

## Definition of done

CI fully green on the PR; for releases additionally: version bumped once, changelog +
release notes written, tag pushed, APK + SHA-256 attached, and
[../skills/final-validation.md](../skills/final-validation.md) completed.
