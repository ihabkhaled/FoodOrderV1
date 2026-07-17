# 17 — ESLint and TypeScript

## Rule

`eslint . --max-warnings 0` and both typechecks (`npm run typecheck` on TypeScript 7.0.2,
`npm run typecheck:tsc` on TypeScript 5.9.3) pass on every change. The lint CI job
additionally requires that `npm run lint:fix` produces zero diff — autofixes must be
committed, never left for CI.

## Motivation

The config (`eslint.config.js`) encodes the architecture: the custom plugin block on
`src/{app,modules,shared,platform,packages}/**` IS the layer enforcement. TS 7 (native
Corsa) is the primary compiler; 5.9.3 remains as compatibility floor and typed-lint parser
(`typescript-eslint` runs on it), so code must be valid under both.

## Required

- Config stack: `@eslint/js` recommended, `tseslint.configs.strictTypeChecked`, `jsx-a11y`,
  `promise`, `regexp`, `sonarjs`, `security`, `unicorn`, `react-hooks`, `react-refresh`,
  `simple-import-sort`, `unused-imports`, `@vitest`/`testing-library` (unit tests),
  `playwright` (e2e), plus the `architecture/*` block — all at error via
  `--max-warnings 0`.
- Run `npm run lint:fix` before committing (husky lint-staged does this for staged
  `*.{ts,tsx}`); commit the fixes.
- `import type` for type-only imports; unused values prefixed `_` or removed.
- New config exemptions (like the existing `src/services/localServices.ts` require-await
  block) carry a justifying comment and an exception document when they touch
  `architecture/*`.

## Forbidden

- `eslint-disable` for any `architecture/*` rule — when a rule fails, the code is in the
  wrong layer. Move or redesign the code. Do not disable the rule.
- Undocumented `eslint-disable` of any other rule (each needs an inline reason and, for
  recurring cases, an exception per [19-exceptions-policy.md](19-exceptions-policy.md)).
- Downgrading rule severity, widening `ignores`, or moving files out of the linted layout
  to dodge enforcement.
- `@ts-expect-error` / `@ts-ignore` in application source without a linked issue/exception.
- Fixing a TS 7 error with syntax that breaks 5.9.3 (or vice versa) — both jobs gate CI.

## Enforcement

- CI jobs `lint` (autofix-diff check + clean run), `typecheck-primary`,
  `typecheck-compatibility`; husky pre-commit (lint-staged) and pre-push
  (typecheck + test).
- Architecture rule behavior is itself tested: `tests/eslint/architecture-plugin.test.ts`.

## Definition of done

`npm run lint:fix` leaves the tree clean and `git status` shows the fixes committed;
`npm run lint`, `npm run typecheck`, `npm run typecheck:tsc` all pass; zero new
suppressions (or each one documented).
