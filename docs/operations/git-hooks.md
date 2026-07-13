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

## Escape hatches (use sparingly, with reason)

- Skip hooks for a single commit/push only when truly necessary: `git commit --no-verify` / `git push --no-verify`.
- `pre-push` intentionally excludes e2e (too slow for every push); CI runs the full suite including e2e.
