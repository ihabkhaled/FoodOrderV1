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

FoodOrderV1 uses stable **Semantic Versioning** (`MAJOR.MINOR.PATCH`) for committed source and unique build identifiers for generated artifacts. `package.json` is the single source place-of-record. Release tools synchronize Firebase Functions, both package locks, Android `versionName` and monotonic `versionCode`, changelog, and release notes.

Contributors change the stable version in one place only: the root `package.json`, through
the release tooling. Every other occurrence is derived/generated compatibility metadata
for npm, Android, iOS, changelog, or release packaging and must never be edited as an
independent source. Runtime and CI scripts read the root package version directly
wherever their platform permits it.

## Prompt-density → bump level

| Density of the driving prompt | Bump | Examples |
| --- | --- | --- |
| **Low** — localized fix, copy/style/doc correction | **PATCH** (`x.y.Z+1`) | label, margin, rule typo, dependency patch |
| **Medium** — backward-compatible feature, flow, screen, or UX overhaul | **MINOR** (`x.Y+1.0`) | new page, sharing capability, product workflow |
| **High** — intentionally breaking public data/contract/API change | **MAJOR** (`X+1.0.0`) | incompatible schema, removed platform, broken public contract |

Additive migrations that preserve old records and clients may remain a minor release. Mixed scope takes the highest triggered level; uncertainty takes the higher level and is documented in release notes.

## Version branches and pull requests

Creating or checking out a target-version branch is a versioning operation. Supported forms include `1.7.0`, `release/1.7.0`, `version/1.7.0`, and `1.7.0/order-sessions`.

- The branch target and stable committed source version must agree before implementation commits are accepted.
- Use `npm run release:start` to synchronize the branch target and `npm run release:branch-check` to verify it.
- Checkout, pre-commit, pre-push, CI, and `quality:release` independently enforce the target.
- Feature and release pull requests must raise the stable source version strictly above
  `main`; new feature branches use a minor bump by default unless prompt density requires
  patch or major. Maintenance branches named `fix/*`, `hotfix/*`, or `dependabot/*` may
  keep the current stable version because the main build stream still assigns a unique
  build number. No pull request may lower the stable source version.
- CI supplies `BASE_VERSION` and the head branch to the release-integrity gate; the gate
  requires a greater version except for the explicitly named maintenance branches above.

## Automated build streams

### Main pushes → `X.Y.Z-<run>`

Every green push to `main` builds and releases automatically without mutating committed manifests. The reusable Android workflow applies `X.Y.Z-<github.run_number>` to the build-only Android `versionName`, names the APK with that version and commit SHA, and publishes its SHA-256. A real tag `vX.Y.Z` ships the clean stable version from the exact tagged commit.

### Non-main pushes → `X.Y.Z-dev.<run>`

Every green non-main push may produce an immutable prerelease artifact `X.Y.Z-dev.<github.run_number>`. Source manifests remain stable `X.Y.Z`; CI never writes version-bump commits back to branches. Explicit workflow inputs may select the exact commit and artifact version while preserving the same source-version invariant.

## Non-negotiables

- Never hand-edit only one derived version; use the version tools.
- Android `versionCode` is monotonically increasing and never reused or decreased.
- Every stable release has synchronized manifests, changelog, release notes, annotated tag, GitHub release, APK, and checksum.
- Every APK is built from the exact commit represented by its tag or immutable prerelease identifier.
- No release or prerelease while any required gate is red, skipped, weakened, or unverified.
- Never bypass Husky, branch-version, release-integrity, or PR version-increase checks.
- Never claim a build identifier as the committed stable source version.

## Tools and skills

- Start or checkout a version branch: [../skills/start-version-branch.md](../skills/start-version-branch.md)
- Final stable release: [../skills/versioning/SKILL.md](../skills/versioning/SKILL.md)
- Mechanical synchronization: `node tools/release/bump-version.mjs <patch|minor|major|X.Y.Z> "summary"`
- Branch check: `node tools/release/ensure-branch-version.mjs --check`

## Definition of done

Root and Functions manifests and locks, Android source version, changelog, and release notes agree; the PR version exceeds the base; every generated artifact is uniquely versioned and checksum-verified; and all mandatory gates are green.

## Pull-request-derived release notes

A green push to `main` after a pull-request merge creates a build-numbered release. CI
starts with `release-notes/vX.Y.Z.md`, resolves the PR associated with the exact merge
commit, and appends its title, body, number, and link. Missing/generic notes or notes from
an older PR are a release failure. Direct tags without an associated PR use the canonical
version notes and remain tied to the exact tagged commit.
