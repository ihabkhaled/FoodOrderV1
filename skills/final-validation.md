# Skill: final validation

The full pre-merge / pre-release pass. Run after the change is complete, before hand-off.
For releases, continue into [versioning/SKILL.md](versioning/SKILL.md) afterwards.

## Required reading

[../rules/20-release-gates.md](../rules/20-release-gates.md),
[../rules/21-review-checklist.md](../rules/21-review-checklist.md).

## Preconditions

- Working tree contains only the intended change (`git status`, `git diff` reviewed;
  Windows note: CRLF-only noise in worktrees is not a change — do not commit line-ending
  churn).
- All targeted validation during development already passed.

## Steps

Run in this order (fail fast, cheapest first):

```bash
npm run knowledge:build:incremental && npm run knowledge:validate
npm run format:check
npm run lint:fix && git diff --exit-code && npm run lint
npm run typecheck && npm run typecheck:tsc
npm run test
npm run test:coverage
npm run build
npm run quality:circular && npm run quality:dead-code && npm run quality:release
node scripts/check-agent-docs.mjs
npm run test:e2e
npm run test:e2e:cross-browser
npm run test:e2e:critical
```

For a release candidate or broad UI/platform change, also run the single combined command
when all browser binaries are installed:

```bash
npm run test:e2e:all
```

Conditionally:

```bash
npm run test:rules          # firestore.rules or Firestore paths changed
npm run functions:validate  # functions/ changed
npm run security:audit      # dependencies changed
npm run cap:sync            # shipped web assets affect native shells
```

Then walk [../rules/21-review-checklist.md](../rules/21-review-checklist.md) against the
diff, and self-review with the reviewer personas selected by risk
([../agents/README.md](../agents/README.md)).

## Forbidden shortcuts

- Skipping a step because it "can't be affected" — the order exists because that
  assumption fails (knip and madge regularly catch "unrelated" moves).
- Reporting a gate green that you did not execute in this state of the tree.
- Fixing a failure and not re-running the earlier gates the fix could invalidate.
- Claiming cross-browser or mobile Safari readiness from the primary Chromium-only gate.

## Required tests

All of the above — this skill IS the test run.

## Validation

Every command above exits 0. Any red gate returns you to the matching fix skill; then
re-run from the top of the affected tier. CI must show the repository `All Gates Green`
check plus the Firefox, WebKit, and mobile Safari cross-browser matrix as successful.

## Definition of done

Full ladder green in one uninterrupted pass on the final tree, checklist walked, honest
report written (including anything conditional you did NOT need to run and why).
