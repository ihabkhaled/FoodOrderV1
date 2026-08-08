# Dependabot Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge Dependabot PRs #43–#55 individually with no downgrades, green protected checks, and deleted head branches.

**Architecture:** Preserve the repository's release-integrity gate while classifying `dependabot/*` heads as same-version maintenance branches, equivalent to `fix/*` and `hotfix/*`. Merge the prerequisite first, then update, validate, merge, and delete each existing Dependabot branch sequentially so every later PR is tested against the latest `main`.

**Tech Stack:** Node.js 26, npm, GitHub Actions, GitHub CLI, Vitest/Node test runner, Playwright, Firebase tooling.

## Global Constraints

- Never downgrade a package, transitive lockfile entry, or GitHub Action.
- Never bypass branch protection or merge a red, skipped, stale, or older-head required check.
- Merge each PR independently and delete its remote branch afterward.
- Preserve all release, security, type-safety, cross-browser, and Android gates.

---

### Task 1: Dependabot release-integrity compatibility

**Files:**
- Modify: `tools/release/versioning-core.mjs`
- Modify: `scripts/check-release-version.mjs`
- Modify: `tests/tooling/versioning-core.test.mjs`
- Modify: `rules/versioning.md`

**Interfaces:**
- Produces: `isSameVersionMaintenanceBranch(branchName): boolean`
- Consumes: `GITHUB_HEAD_REF` from the existing release-integrity script

- [ ] Add assertions accepting `fix/*`, `hotfix/*`, and `dependabot/*`, and rejecting feature/release branches.
- [ ] Run `node --test tests/tooling/versioning-core.test.mjs` and verify the missing export fails.
- [ ] Add the helper and use it in `check-release-version.mjs` without changing downgrade rejection.
- [ ] Update the canonical versioning rule.
- [ ] Run tooling, release-integrity, format, lint, typecheck, tests, audit, and build checks.
- [ ] Push a `fix/*` PR, verify both aggregate checks on its exact head SHA, merge, and delete the branch.

### Task 2: GitHub Actions upgrades

**Files:**
- Modify through PR #43: `.github/workflows/android-apk.yml`
- Modify through PR #44: `.github/workflows/branch-continuous-release.yml`, `.github/workflows/ci.yml`
- Modify through PR #45: workflow `actions/setup-node` references
- Modify through PR #46: workflow `actions/setup-java` references

- [ ] For each PR #43–#46, update the branch from current `main`.
- [ ] Verify the diff contains only the advertised forward upgrade.
- [ ] Verify `All Gates Green` and `Cross-Browser All Green` succeed for the current head.
- [ ] Merge through protected GitHub flow and delete the head branch.

### Task 3: npm upgrades

**Files:**
- Modify through PRs #48–#55: `package.json` and/or `package-lock.json`

- [ ] For each PR #48–#55, update the branch from current `main`.
- [ ] Verify the requested version is at or above the stated target and no dependency is downgraded.
- [ ] Verify audits, application gates, and both aggregate browser/repository checks succeed for the current head.
- [ ] Merge through protected GitHub flow and delete the head branch.

### Task 4: Final main verification

**Files:**
- Verify: `package.json`, `package-lock.json`, `.github/workflows/*.yml`

- [ ] Fetch final `main` and verify all twelve target versions/references.
- [ ] Verify all twelve PRs are merged and their remote head branches are absent.
- [ ] Verify the final `main` workflow and cross-browser aggregate succeed for the exact final SHA.
- [ ] Verify the post-merge release contains the final merged PR metadata and required artifacts.
