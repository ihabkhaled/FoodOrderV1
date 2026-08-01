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

### Execution order

Use focused direct tests and targeted lint/type/build checks during implementation. Once
the feature behavior is stable, update affected canonical docs and regenerate knowledge.
Then run the mandatory suite below against that completed fixed point. Avoid restarting
the full suite after every small edit; if a final gate fails, repair it, rerun the affected
gate, and reproduce the final aggregate before push or hand-off.

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
- Branch pushes run the same mandatory repository gates before the immutable APK and
  prerelease jobs may start. A skipped downstream job is not success: repair the upstream
  gate, push the fix, and verify all three jobs complete.
- Generated knowledge is part of the committed fixed point. Run format and `lint:fix`
  first, regenerate `.ai/`, then reproduce `knowledge:build` followed by `lint:fix` and
  require no non-report diff. Case-only file names must match Git exactly on Linux.
- Time-bounded scanner exceptions require a written `docs/exceptions/EXC-*` owner,
  exact advisory/package scope, expiration/removal condition, and fail-closed tooling for
  every non-excepted finding.
- PR version bump: on a pull request, `quality:release` also requires `package.json`
  `version` to be strictly greater than `main` (MINOR by default for feature branches).
  Bump at branch start: `npm run release:minor -- "summary"`.

## Automated release streams

- **Push to `main`** auto-releases a build-numbered version `X.Y.Z-<n>` (APK +
  GitHub release) **without changing `package.json`**; the base `X.Y.Z` bumps only via a
  deliberate tool bump. Tag `vX.Y.Z` releases the clean version. See
  [versioning.md](versioning.md) and [../docs/operations/versioning.md](../docs/operations/versioning.md).
- `<n>` counts builds **of that version** and is derived from existing release tags, so it
  restarts at `0` whenever the version changes. Never wire a release version to
  `github.run_number` or any other repository-wide counter: it never resets, so the number
  says nothing about the version it is attached to.
- **Every pull request** ships its release notes, an auto-composed description, and a
  built APK. `quality:release` fails the PR when `release-notes/vX.Y.Z.md` is missing,
  `branch-continuous-release.yml` publishes the prerelease + APK once all branch gates
  pass, and `pull-request-brief.yml` writes the description from those same notes.

## Forbidden

- Merging with any red gate; retrying flakes into green without diagnosing.
- Treating skipped APK/prerelease jobs as fulfilled when their upstream branch gate failed.
- `--no-verify`, hook bypasses, force-pushes over gate failures.
- Hand-editing derived versions (gradle versionName/versionCode, docs) — run the tool.
- Publishing a release or prerelease whose body is a generated sentence rather than the
  version's release notes. "Automated prerelease from branch X" describes the process, not
  the build, and leaves a reader no way to know what shipped. Every release body is
  composed from `release-notes/vX.Y.Z.md` — see
  [../skills/write-release-notes.md](../skills/write-release-notes.md).
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

## Protected pull-request and merge-queue gates

GitHub branch protection for `main` must require these exact stable contexts:

- `All Gates Green`: every job aggregated by `.github/workflows/ci.yml`, including the
  primary Chromium desktop, Pixel 7, and iPad Mini E2E projects.
- `Cross-Browser All Green`: Firefox, desktop WebKit, and iPhone mobile Safari from
  `.github/workflows/cross-browser-e2e.yml`.

Required status checks are strict: the branch must be current with `main`, and the green
statuses must belong to the current PR head SHA or current merge-queue candidate.
Successful checks on an earlier commit are stale evidence. Pending, skipped, cancelled,
neutral, timed-out, or action-required conclusions do not satisfy the contract.

Both workflows run for `pull_request`, `merge_group`, and pushes to `main`. Protection
requires a PR, resolved conversations, no force-push/deletion, and applies to
administrators. Do not merge while the latest commit is still running, even when an
earlier commit was fully green. See
[../docs/operations/required-merge-gates.md](../docs/operations/required-merge-gates.md).

## Release body composition

Every release body — prerelease and `main` alike — is composed from the version's release
notes by `tools/release/compose-release-notes.mjs`, which appends only build provenance
(version, commit, branch, gate statement). The notes themselves are written once in
`release-notes/vX.Y.Z.md` per
[../skills/write-release-notes.md](../skills/write-release-notes.md). The composers are
covered by `npm run test:tooling`.

## Post-merge release description gate

After every pull-request merge, the green `main` workflow creates or updates the
build-numbered GitHub release. Its description must combine the canonical version release
notes with the merged PR title, body, number, and link resolved from the exact merge
commit. Release creation and APK checksum upload are monitored before the change is done.
