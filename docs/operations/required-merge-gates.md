# Required merge gates

This runbook defines the GitHub protection contract for `main`. It prevents a pull
request that looked green on an older commit from producing red post-merge CI.

## Required status contexts

| Context | Proves |
| --- | --- |
| `All Gates Green` | Core CI, including primary Chromium desktop, Pixel 7, and iPad Mini E2E |
| `Cross-Browser All Green` | Firefox, desktop WebKit, and iPhone mobile Safari all succeeded |

Require the aggregate contexts instead of matrix-generated job names. Aggregates are
stable branch-protection APIs and fail when any dependency fails, is cancelled, or is skipped.

## `main` protection settings

- Require a pull request before merging; direct pushes are not a release path.
- Require both status contexts above with strict/up-to-date checking enabled.
- Require conversation resolution.
- Apply protection to administrators; no routine bypass.
- Disallow force pushes and branch deletion.
- If merge queue is enabled, require the same contexts on the `merge_group` candidate.

A valid merge decision compares each required check suite SHA with the current PR head
SHA (or current merge-group SHA). Green output from an older SHA is stale. Pending,
skipped, cancelled, neutral, timed-out, or action-required states are not accepted.

## Workflow ownership

- `.github/workflows/ci.yml` publishes `All Gates Green`.
- `.github/workflows/cross-browser-e2e.yml` publishes `Cross-Browser All Green`.
- Both workflows trigger on `pull_request`, `merge_group`, and pushes to `main`.
- Push runs remain required incident detection, but PR protection must prevent them from
  discovering failures that were already reproducible on the merge candidate.

## Trivy security gate

The Trivy job intentionally has two phases with different responsibilities:

1. `Trivy filesystem report` writes the SARIF artifact and must not decide pass/fail. It
   uses `limit-severities-for-sarif: true` so the report honors the configured
   `CRITICAL,HIGH` severity scope, and it exits zero after producing the artifact.
2. `Enforce Trivy high and critical findings` is the policy gate. It performs the same
   filesystem scan in table mode with `exit-code: '1'`, so any unfixed HIGH or CRITICAL
   finding still fails CI.

Do not make the SARIF reporting pass blocking. Trivy SARIF includes all severities by
default unless `limit-severities-for-sarif` is enabled, which can turn a MEDIUM advisory
into a false failure even though repository policy blocks HIGH and CRITICAL findings.
Likewise, do not weaken or remove the enforcement pass merely to make CI green.

**When not to use this pattern:** if repository policy changes to block MEDIUM findings,
change the severity on both phases and the dependency policy together. Do not encode a
stricter threshold accidentally in the reporting format.

## Audit

Use GitHub CLI to inspect the effective protection and the latest commit:

```bash
gh api repos/ihabkhaled/FoodOrderV1/branches/main/protection
gh pr checks <number> --required
gh pr view <number> --json headRefOid,mergeStateStatus,statusCheckRollup
```

Before merge, confirm both required aggregates are `SUCCESS` and attached to the
reported `headRefOid` or merge-group candidate. After merge, monitor the `main` push run
until both aggregates complete; any red result is repaired through another pull request.

The `main` push is not complete until the release job also succeeds. Verify the versioned
GitHub release contains the canonical `release-notes/vX.Y.Z.md` content followed by the
merged pull request title, body, number, and link, and verify the APK and checksum assets
are attached.

## Incident lesson

The v1.7.2 merge included a dashboard contrast test that found the desktop sidebar
theme control while running at mobile/tablet viewports. The PR had earlier green runs,
but `main` had no effective required-status protection, so the latest failing candidate
could be merged. The repair makes the test viewport explicit and makes both browser
aggregates mandatory on the exact candidate being merged.
