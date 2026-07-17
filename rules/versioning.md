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

FoodOrderV1 uses stable **Semantic Versioning** (`MAJOR.MINOR.PATCH`) for committed source and unique prerelease identifiers for generated branch/main build artifacts.

`package.json` is the source place-of-record. The release tools synchronize Firebase Functions, package-lock metadata, Android `versionName`/`versionCode`, changelog, and release notes.

## Prompt-density → bump level

| Density of the driving prompt | Bump | Examples |
| --- | --- | --- |
| **Low** — localized fix, copy/style/doc correction | **PATCH** (`x.y.Z+1`) | label, margin, rule typo, dependency patch |
| **Medium** — backward-compatible feature, flow, screen, or UX overhaul | **MINOR** (`x.Y+1.0`) | new page, sharing capability, product workflow |
| **High** — intentionally breaking public data/contract/API change | **MAJOR** (`X+1.0.0`) | incompatible schema, removed platform, broken public contract |

Additive migrations that preserve old records may remain a minor release. Any genuinely incompatible change is major regardless of desired marketing version.

When a prompt mixes densities, apply the highest level and record the rationale.

## Version-branch rule

Creating or checking out a target-version branch is itself a versioning operation.

Supported examples:

- `1.7.0`
- `release/1.7.0`
- `version/1.7.0`
- `1.7.0/order-sessions`

The branch target and committed source version must agree before implementation commits are accepted.

Use [../skills/start-version-branch.md](../skills/start-version-branch.md):

```bash
npm run release:start
npm run release:branch-check
```

The checkout hook applies synchronization when needed. Pre-commit, pre-push, CI, and `quality:release` independently enforce it so missing one local hook cannot corrupt history.

A pull request must carry a stable source version strictly greater than its base branch version.

## Immutable development builds

Do not create CI commits for every build. Self-mutating version workflows create loops, race conditions, noisy history, and unverifiable source states.

Instead:

- committed source remains `X.Y.Z`;
- every green non-main branch push produces `X.Y.Z-dev.<run-number>`;
- the APK name and prerelease tag also contain the commit SHA;
- every generated APK has a SHA-256 checksum;
- `main` keeps its green-gated continuous release identifier;
- a stable release tag remains exactly `vX.Y.Z` and points to the exact stable source commit.

This satisfies unique versioning for every pushed build without modifying the branch after the tested commit.

## Non-negotiables

- Never hand-edit only one derived version; use the version tools.
- Android `versionCode` is monotonically increasing and never reused or decreased.
- Every stable release has synchronized manifests, changelog, release notes, annotated tag, GitHub release, APK, and checksum.
- Every prerelease artifact is tied to one exact commit and is published only after all required gates pass.
- No release or prerelease while any required gate is red.
- Never bypass Husky, release-integrity, or PR version-increase checks.
- Never claim a prerelease identifier as the stable source version.

## Tools and skills

- Start/checkout branch: [../skills/start-version-branch.md](../skills/start-version-branch.md)
- Stable final release: [../skills/versioning/SKILL.md](../skills/versioning/SKILL.md)
- Mechanical synchronization: `node tools/release/bump-version.mjs <patch|minor|major|X.Y.Z> "summary"`
- Branch check: `node tools/release/ensure-branch-version.mjs --check`

## Definition of done

The source, Functions package, Android source version, changelog, and release notes agree; the PR version exceeds the base; every generated artifact is uniquely versioned and checksum-verified; and all gates are green.
