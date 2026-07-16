---
id: MEM-PITFALLS
title: Known Pitfalls
type: guide
authority: canonical
status: active
owner: knowledge-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Known pitfalls for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-16
verificationMethod: source and test inspection
generated: false
---

# Known pitfalls

Real traps that have bitten (or will) in this repo. Each is stated as the mistake plus the
correction.

## Process and tooling

- **Lint CI requires committed autofixes.** The `lint` job runs `npm run lint:fix` and then
  `git diff --exit-code` — locally-clean-but-unfixed formatting/import order fails CI even
  though `npm run lint` passes on your machine. Always run `lint:fix` and commit the result.
- **`.ai/` is generated.** Hand edits are overwritten by the next build and can fail
  `knowledge:validate`. Edit the canonical source doc, then run
  `npm run knowledge:build:incremental`.
- **Typecheck runs under TWO TypeScript versions.** `npm run typecheck` (7.0.2) and
  `npm run typecheck:tsc` (5.9.3) both gate CI. A fix valid in one can fail the other —
  run both before claiming green.
- **`functions/package.json` version must match root.** `npm run quality:release` fails
  the build otherwise; only `npm run release:*` should bump versions (it also syncs
  `android/app/build.gradle`).
- **Windows CRLF noise in worktrees.** Fresh worktrees can show phantom whole-file diffs
  from line endings. Do not commit line-ending churn; check `git diff --stat` sanity before
  staging, and keep `.editorconfig` semantics intact.
- **Husky hooks are part of the contract.** Pre-commit (lint-staged), commit-msg
  (commitlint conventional), pre-push (typecheck + test). `--no-verify` is forbidden;
  a failing hook is a real finding.
- **knip and madge fail on "unrelated" moves.** Moving/renaming files strands exports and
  creates cycles that only `quality:dead-code` / `quality:circular` catch — run them after
  any restructuring, not just before release.

## Testing

- **E2E always runs local mode.** `playwright.config.ts` forces `VITE_FORCE_LOCAL_MODE=true`
  — e2e proves nothing about live Firebase. Cloud behavior evidence = rules suites +
  deployed-callable smoke tests. Never claim otherwise.
- **Two Playwright projects.** chromium desktop AND mobile-chrome (Pixel 7); desktop-only
  assertions fail the suite. `.spec.ts` = e2e lint rules, `.test.ts` = vitest lint rules —
  wrong suffix produces confusing lint errors.

## Domain (pre-1.6.0, still binding)

- Do not delete orders when a bucket is deleted (orders own immutable snapshots).
- Do not calculate historical order lines from current bucket prices.
- Do not import Firebase directly in UI (now mechanical: `architecture/no-raw-package-imports`).
- Do not initialize Firebase with partial configuration — empty config means local mode.
- Do not claim local-device mode syncs or securely authenticates users.
- Do not permit transitions out of terminal order statuses (completed/cancelled).
