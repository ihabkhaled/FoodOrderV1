# Git hooks (Husky)

Mirrors the enforcement style of the reference repos (NextRanger / IronNest / TwinzyAI). Hooks are
installed automatically by `npm install` (the `prepare: husky` script). They are a fast local safety
net — **CI remains the source of truth**, so hooks never replace the pipeline gates.

| Hook | Runs | Purpose |
|---|---|---|
| `pre-commit` | `lint-staged` → `eslint --fix --max-warnings 0` on staged `*.ts/*.tsx` | keep every commit lint-clean; auto-fix what it can |
| `commit-msg` | `commitlint` (`@commitlint/config-conventional`) | enforce Conventional Commits (`type(scope): subject`) |
| `pre-push` | `npm run typecheck && npm run test` | block pushes that fail typecheck or unit/integration tests |

## Conventional commit types

`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
Example: `feat(sidebar): add collapsible rail`.

## Gate handoff

- `pre-push` intentionally excludes e2e (too slow for every push); CI runs the full suite including e2e.
- A non-main branch push must complete `Branch All Gates Green` before CI generates the
  immutable APK and publishes its prerelease. Skipped downstream jobs after a red gate
  are incomplete, not accepted skips.
- Vercel runs install plus `npm run build:web` only. Hooks and GitHub CI own repository
  quality checks; hosting does not duplicate them.

## Forbidden bypasses

`git commit --no-verify` and `git push --no-verify` are forbidden. Fix the hook or gate
failure and run it again.
