# Repo hygiene report

Date: 2026-07-13. Scope: tracked worktree + full git history.

## Sensitive data

| Check | Result |
|---|---|
| `.env` tracked? | No — gitignored (`.env*` with `!.env.example`) |
| Keystores / `*.jks` / `*.p12` / `*.pem` / `id_rsa` tracked? | None |
| Service-account JSON / `google-services.json` / `GoogleService-Info.plist` tracked? | None |
| `*.apk` committed? | None (release artifacts live on the GitHub release, never in the repo) |
| Real production Firebase API key committed (worktree or history)? | **Never** — verified with `git grep` over `git rev-list --all` |
| Private keys (`BEGIN … PRIVATE KEY`) in history? | None |

The only `AIzaSy…` occurrences in history are the **truncated** legacy key (`AIzaSyCbvB…`) inside the
security writeups (`audit/legacy-foodorder-map.md`, `audit/security-review.md`) that document finding
SEC-LEG-001; no full key is present. Firebase **web** config values are public client identifiers and
are supplied at build time from `.env` / CI repository variables, not from source.

## Unneeded / unused files

| Check | Result |
|---|---|
| Junk files (`.orig`, `.bak`, `.tmp`, `.swp`, `.DS_Store`, `Thumbs.db`) | None |
| Tracked build outputs (`dist/`, `coverage/`, `playwright-report/`, `test-results/`, `node_modules/`) | None (all gitignored) |
| Orphan source modules (never imported) | None — every `src/**` file is referenced (`services/index.ts` is the `@/services` barrel) |
| Empty ceremonial folders | None created — the target-structure's 30+ AI-mirror files and empty dirs were deliberately **not** added (they would themselves be unneeded files) |
| Local UI screenshots (`ui-shots/`) | Gitignored, never committed |

## Largest tracked files (all justified)

`package-lock.json` (deterministic install) and the generated Android/iOS splash/icon PNGs
(required by the committed native platforms). No stray binaries.

## Conclusion

Repository is clean: no sensitive data pushed, no unneeded or unused files. Nothing removed because
nothing qualifying was found.
