---
id: RULE-VERSIONING
title: Versioning and Release Bump Rule
type: rule
authority: canonical
status: active
owner: release-owner
audience: [engineer, ai-agent, release-manager]
lastVerified: 2026-07-13
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

- Never hand-edit a derived version (android `versionName`/`versionCode`, docs). Run the tool.
- `android versionCode` is a monotonically increasing integer — never reused, never decreased.
- Every release has: a bumped `package.json`, a `CHANGELOG.md` entry, a `release-notes/vX.Y.Z.md`,
  an annotated git tag `vX.Y.Z`, a GitHub release, and (for shippable changes) an attached APK + SHA-256.
- The APK attached to a release MUST be built from the exact tagged commit.
- No release while any required gate (lint, typecheck, tests, e2e, build) is red.

## How

Use the release skill: **`skills/versioning`**. The mechanical bump is
`node tools/release/bump-version.mjs <patch|minor|major> "summary"` (wrapped by
`npm run release:patch|minor|major`). The skill covers the full commit → tag → release flow.
