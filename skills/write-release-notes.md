# Skill: write the release notes every build publishes

Use this skill whenever you open a pull request, cut a version branch, or change what a
release contains. `release-notes/v<version>.md` is the single source of truth: the pull
request description, every branch prerelease, and the `main` release all publish it.
Nothing generates a second summary.

## Required reading

- [../rules/20-release-gates.md](../rules/20-release-gates.md)
- [../rules/versioning.md](../rules/versioning.md)
- [../docs/operations/versioning.md](../docs/operations/versioning.md)

## Where the notes end up

| Surface | How it gets there |
| --- | --- |
| Pull request description | `pull-request-brief.yml` → `tools/release/pull-request-brief.mjs` |
| Branch prerelease | `branch-continuous-release.yml` → `tools/release/compose-release-notes.mjs` |
| `main` release | `ci.yml` `release-apk`, plus the merged pull request body |

Write it once, in the file. Never paste a summary into a release body by hand, and never
let a workflow invent one — a generated sentence such as "Automated prerelease from branch
X" tells a reader nothing about what the build contains.

## Required structure

````markdown
# FoodOrderV1 v<version>

One or two sentences a non-engineer can read: what this release is for.

## Highlights

- One bullet per user-visible change. Lead with what changed for the reader, then why.
- Name the behaviour, not the file. "Deleting an account now re-checks the password",
  not "updated danger-reauth-dialog".
- A fix states the symptom it removes and, when it is not obvious, the cause.

## Validation

- The gates that actually ran, with real numbers.

## Known limitations

- Anything a reader would otherwise report as a bug.
````

`## Highlights` is load-bearing: `pull-request-brief.mjs` lifts exactly those bullets into
the pull request description. A release with no `## Highlights` section produces a brief
that says only "see the release notes".

## Rules for the prose

- Write for someone who did not watch the work. No internal codenames, no ticket numbers
  standing in for a description.
- Claim only what you verified. "195/195 across chromium, mobile-chrome, tablet-chrome"
  beats "all tests pass".
- State limitations plainly. A known gap in the notes is information; the same gap
  discovered by a user is a bug report.
- Keep one bullet to one change. If a bullet needs "and also", it is two bullets.

## Workflow

1. `npm run release:start` (or `release:minor`) scaffolds `release-notes/v<version>.md`
   when the branch version changes. Never create the file by hand-copying an old one.
2. Add to `## Highlights` in the same commit that changes behaviour, while the reason is
   still fresh. Notes written at the end of a branch are always thinner.
3. Before pushing, read the notes as a stranger. If a bullet does not say what changed
   for a reader, rewrite it.
4. `npm run quality:release` fails the build when the file is missing, and
   `npm run test:tooling` covers the composition itself.

## Verification

```bash
npm run quality:release          # the notes file exists for this version
npm run test:tooling             # the composers behave
node tools/release/compose-release-notes.mjs --build-version=x --commit=abc1234 --prerelease
node tools/release/pull-request-brief.mjs
```

The last two print exactly what a release body and a pull request description will contain.
Read that output before pushing — it is what everyone else will read.
