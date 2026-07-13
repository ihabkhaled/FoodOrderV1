# Phase 11 — Security, privacy, and supply-chain review

Date: 2026-07-13. Scope: worktree at release candidate, dependencies, configuration, native shell, release path.

## Scans executed
| Tool | Command | Result |
|---|---|---|
| Trivy 0.71.0 | `trivy fs --scanners vuln,secret,misconfig --skip-dirs node_modules,dist,coverage,android/.gradle,.git .` | **0 findings** (no vulnerabilities at gate severities, no secrets, no misconfigurations) |
| npm audit | `npm audit` | 8 moderate, 0 high/critical — all in one chain: `uuid < 11.1.1` under **firebase-admin** (gaxios → google-gax → @google-cloud/firestore → firebase-admin) |
| ESLint security posture | strictTypeChecked + no-floating-promises, `--max-warnings 0` | pass |

### npm audit disposition (reviewed exception)
`firebase-admin` is a **devDependency** consumed exclusively by `scripts/migrate-legacy-data.mjs`
(offline, operator-run, service-account context). It is never bundled into the client app or APK
(verified: vite bundle contains only `firebase/*` web SDK chunks). The proposed "fix" downgrades
firebase-admin to 10.x (worse). Disposition: **accepted for release**, revisit with dependabot
group PR #4 (firebase-admin 14.x) after release. Recorded RISK-010.

## Findings and dispositions
| ID | Finding | Severity | Disposition |
|---|---|---|---|
| SEC-LEG-001 | Legacy repo `ihabkhaled/FoodOrder` has a **committed public `.env`** with an older Firebase API key (`AIzaSyCbvB…`) for the same project | Medium | **Action required in Google Cloud Console (owner):** add application restrictions to the legacy key or delete it; verify RTDB rules for `usersData/**` deny public access. Cannot be executed from this environment; tracked in release notes + risk register |
| SEC-001 | Firebase web config in destination `.env` (untracked) and `.env.example` placeholders | Info | Correct by design: web config values are public client identifiers; authorization is enforced by Auth + Security Rules (orchestrator rule: not secrets). Real `.env` is gitignored and never committed |
| SEC-002 | Invite tokens | — | 144-bit random, SHA-256 hash at rest (doc id), 72h expiry enforced client-side **and** in rules (`expiresAtMillis > request.time`), single-use via atomic pending→accepted transition, revocable |
| SEC-003 | Authorization | — | Full rules matrix (firestore.rules) mirrors src/lib/sharing.ts; owner-scoped legacy paths; per-user contribution docs; append-only mutation + activity ledgers; contributor bucket updates restricted to `aggregate/revision/updatedAt` via MapDiff |
| SEC-004 | Android shell | — | Single permission (INTERNET); `androidScheme: https`; cleartext off by default (targetSdk 36); RTL supported; debug APK signed with debug keys (documented limitation); no secrets in APK resources (web bundle inspected — only public Firebase client config, same as any Firebase web app) |
| SEC-005 | Logging/redaction | — | No `console.log` of env or personal data in src (grep-verified); errors surfaced as safe message keys |
| SEC-006 | Rules emulator tests | Gap | Firebase CLI/emulator unavailable locally (RISK-002); rules verified by static cross-review against the permission matrix + adapter integration tests. Follow-up: add emulator suite in CI |
| SEC-007 | Client-side invite acceptance (no Cloud Functions) | Accepted | No-cost plan; rules validate every writable field (role from invite via getAfter, acceptedBy binding, expiry, single-use). RISK-008 |

## Secret hygiene
- Worktree + history: Trivy secret scanner clean; `.gitignore` covers `.env*` (allow-list `.env.example`), `local.properties`, keystores absent.
- CI: no secrets echoed; Firebase client config provided to CI through **repository variables** (non-secret public identifiers), never service accounts.
- Release signing: debug-only this release; the release-signing runbook (operations/delivery-plan.md) stores keystores exclusively in GitHub encrypted secrets.

## Privacy
- Data export (FEAT-059) and account deletion (FEAT-060) implemented in both adapters; deletion cascades owned buckets/subcollections/orders/mirrors, marks foreign memberships `left`, keeps group-order snapshots (documented product rule), then deletes the auth user.
- Activity metadata restricted to safe fields (names, quantities, totals) — never tokens or other members' emails.
