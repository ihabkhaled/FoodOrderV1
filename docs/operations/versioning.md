# Versioning & releases

Change the stable version once through the release tooling. Root `package.json` is the
only source of truth. Functions/npm-lock metadata, native marketing versions and
monotonic build numbers, changelog headings, and release notes are generated
compatibility outputs, not independent version sources; never edit them as a manual
multi-file bump.

FoodOrderV1 follows [Semantic Versioning](https://semver.org). One place-of-record
(`package.json` `version`) drives every derived version. The **bump level is chosen by prompt
density** — how large the requested change is (see [rules/versioning.md](../../rules/versioning.md)).

## Quick reference

| You changed… | Bump | Command |
|---|---|---|
| a label, margin, copy, one small fix, docs | patch | `npm run release:patch -- "…"` |
| a new feature / flow / screen / UX overhaul | minor | `npm run release:minor -- "…"` |
| schema / contract / rules / architecture (breaking) | major | `npm run release:major -- "…"` |

Example progression: `1.0.0 → 1.0.1 → 1.0.2 → 1.1.0 → 2.0.0`.

## What a bump touches

- `package.json` `version` (the place-of-record)
- `functions/package.json` `version` — kept equal to root (`quality:release` enforces this)
- `android/app/build.gradle` — `versionName` (= semver) and `versionCode` (auto-incremented integer)
- `CHANGELOG.md` — a new dated section
- `release-notes/vX.Y.Z.md` — scaffolded if missing

## Automated versioning in CI

Two version streams run automatically — you rarely bump `package.json` by hand except when
starting a branch.

### Push to `main` → build number `X.Y.Z-<n>`, auto release + APK

Every push to `main` triggers a full build and release **without touching `package.json`**:

- `android-apk.yml` resolves a **build version** = `<package.json version>-<n>` (e.g.
  `1.8.0-3`), overrides the Android `versionName` for that build only, and produces
  `FoodOrderV1-v<build>-<sha7>-debug.apk` (+ `.sha256`).
- `release-apk` publishes GitHub release **`v<build>`** with the APK attached.
- `package.json` stays at the clean `X.Y.Z`; the build number is a CI artifact stamp, not a
  source change (so there is no bot commit and no CI loop).
- Pushing a real annotated tag `vX.Y.Z` instead releases the clean `X.Y.Z`.

`<n>` counts builds **of that version**, not builds of the repository. It is derived from the
release tags that already exist (`tools/release/next-build-number.mjs`), so it increases within a
version and **restarts at `0` when the version changes**: `1.8.0-0`, `1.8.0-1`, `1.8.0-2`, then
`1.9.0-0`. Nobody has to reset it, and a version nobody has built yet always starts at zero.

It used to be `github.run_number`, a repository-wide counter that never resets — `1.8.0-347` said
nothing about how many times `1.8.0` had been built. Branch prereleases follow the same rule as
`X.Y.Z-dev.<n>`, with the short commit SHA appended to the tag so two branches on the same version
cannot collide.

### New branch / PR → bump MINOR before merge (enforced)

When you cut a feature branch off `main` (currently `1.6.0`), **bump the minor version first**:

```bash
git switch -c feature/whatever
npm run release:minor -- "what this branch does"   # 1.6.0 -> 1.7.0, syncs functions + gradle
git commit -am "chore(release): bump to 1.7.0"
```

The `release-integrity` CI job resolves `BASE_VERSION` from `main` and `npm run quality:release`
**fails the PR** until `package.json` `version` is strictly greater than main's. New feature
branches bump MINOR by default; use `release:patch`/`release:major` per the density table when
that fits better. On merge to `main`, the build-number stream above takes over for day-to-day
builds until the next branch bumps the base again.

### Release bodies are the release notes

Every release body — branch prerelease and `main` release alike — is composed from
`release-notes/vX.Y.Z.md` by `tools/release/compose-release-notes.mjs`, which appends only
the build's own facts (version, commit, branch, gate statement).

Prereleases used to carry a single generated sentence — *"Automated prerelease from branch
X. Every mandatory branch gate passed for commit Y."* — which described the process and
said nothing about what the build contained. Writing the notes once, in the file, is the
rule: see [../../skills/write-release-notes.md](../../skills/write-release-notes.md) and
[../../rules/20-release-gates.md](../../rules/20-release-gates.md).

Preview exactly what will be published before pushing:

```bash
node tools/release/compose-release-notes.mjs --build-version=1.8.0-dev.7 --commit=abc1234 --prerelease
node tools/release/pull-request-brief.mjs
```

### Every pull request ships notes, a description, and a build

- `quality:release` fails the PR when `release-notes/vX.Y.Z.md` is missing, so the notes exist
  before review starts.
- `branch-continuous-release.yml` builds the APK and publishes an immutable prerelease
  `vX.Y.Z-dev.<n>-<sha7>` for every branch push that passes all gates.
- `pull-request-brief.yml` writes the PR description from those notes and links the prerelease
  built from the exact head commit. It only rewrites the block between
  `<!-- release-brief:start -->` and `<!-- release-brief:end -->`, so anything a reviewer or
  author types around it survives every later push.

### Cheat sheet

| Event | Version used | Where |
|---|---|---|
| Push to `main` | `X.Y.Z-<n>` | APK name, versionName, GitHub release tag |
| Open/adv. a PR | must be `> main` (MINOR default) | `package.json` (enforced by `quality:release`) |
| Push tag `vX.Y.Z` | `X.Y.Z` (clean) | release tag = the git tag |

## Full flow

Follow the **`skills/versioning`** skill: green gates → bump → write notes → commit → tag →
build APK from the tag → push → `gh release` with APK + SHA-256. iOS artifacts are produced on
macOS separately (see [platform-support.md](platform-support.md)).

## Rules of the road

- Never hand-edit a derived version — run `tools/release/bump-version.mjs`.
- `versionCode` is monotonic: never reused or decreased.
- The released APK is built from the exact tagged commit; its SHA-256 is recorded.
- No release with a red gate.

## Release descriptions after pull-request merges

The `release-apk` job resolves the pull request associated with the exact `main` merge
commit. It copies `release-notes/vX.Y.Z.md`, appends a `Merged pull request` section with
the PR title, body, number, and link, and passes that file to `gh release create` or
`gh release edit`. The APK and SHA-256 are then uploaded to the same release.

After every merge, verify the release exists and that its description matches the merged
PR. A release that contains only generic generated notes, stale PR text, or no description
is incomplete even when the APK uploaded successfully.
