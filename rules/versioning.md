---
id: RULE-VERSIONING
title: Versioning and Release Bump Rule
type: rule
authority: canonical
status: active
owner: release-owner
audience: [engineer, ai-agent, release-manager]
lastVerified: 2026-07-18
---

# Versioning rule

FoodOrderV1 uses **Semantic Versioning** (`MAJOR.MINOR.PATCH`) with a single place-of-record
(`package.json` `version`). Every release bumps the version, and the bump level is decided by
**prompt density** — the size and nature of the change requested in the driving prompt.

## Prompt-density → bump level

| Density of the driving prompt                                                                                                                       | Bump                  | Examples                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------- |
| **Low** — a localized fix, copy tweak, style nudge, single-file correction, doc-only change                                                         | **PATCH** (`x.y.Z+1`) | fix a label, adjust a margin, correct a rule typo, dependency patch         |
| **Medium** — a new user-visible feature, flow, screen, or a cross-file behavior change that stays backward-compatible                               | **MINOR** (`x.Y+1.0`) | add a settings toggle, a new page, a UX overhaul, a new sharing capability  |
| **High** — a breaking data/schema/contract/API change, a Firestore-rules break, an architecture migration, or anything requiring migration/rollback | **MAJOR** (`X+1.0.0`) | change the bucket schema version, rename a public contract, drop a platform |

When a prompt mixes densities, **apply the highest** level it triggers. When unsure between two
levels, pick the higher one and record the rationale in the release notes.

## Non-negotiables

- Never hand-edit a derived version (android `versionName`/`versionCode`, `functions/package.json`, docs). Run the tool — `bump-version.mjs` syncs them all from the `package.json` place-of-record.
- `android versionCode` is a monotonically increasing integer — never reused, never decreased.
- Every release has: a bumped `package.json`, a `CHANGELOG.md` entry, a `release-notes/vX.Y.Z.md`,
  an annotated git tag `vX.Y.Z`, a GitHub release, and (for shippable changes) an attached APK + SHA-256.
- The APK attached to a release MUST be built from the exact tagged commit.
- No release while any required gate (lint, typecheck, tests, e2e, build) is red.

## How

Use the release skill: **`skills/versioning`**. The mechanical bump is
`node tools/release/bump-version.mjs <patch|minor|major> "summary"` (wrapped by
`npm run release:patch|minor|major`). The skill covers the full commit → tag → release flow.

## Automated build & branch versioning (CI)

Two version streams are automated in `.github/workflows/` (see
[docs/operations/versioning.md](../docs/operations/versioning.md)):

### Main pushes → build number `X.Y.Z-<run>` (automatic release + APK)

Every push to `main` builds and releases automatically **without changing `package.json`**.
The APK and GitHub release are stamped `X.Y.Z-<github.run_number>` (e.g. `1.6.0-42`):
`android-apk.yml` resolves the build version, overrides the Android `versionName` for that
build only, and names the APK `FoodOrderV1-v<build>-<sha7>-debug.apk`; the `release-apk`
job publishes GitHub release `v<build>`. `package.json` stays at the stable `X.Y.Z` — the
base version changes only via a deliberate tool bump. Pushing a real tag `vX.Y.Z` releases
the clean `X.Y.Z`.

### Branches / PRs → bump MINOR before merge (enforced gate)

A pull request MUST raise `package.json` `version` above `main`. **New feature branches
bump MINOR by default** (`1.6.0 → 1.7.0`); use patch/major per the density table above.
The `release-integrity` job supplies `BASE_VERSION` (main's version) and
`npm run quality:release` fails the PR until the branch is bumped. Bump at branch start with
`npm run release:minor -- "summary"` (also syncs `functions/package.json`), commit, then open
the PR.
