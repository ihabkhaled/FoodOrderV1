# Skill: fix ESLint / typecheck failures

## Required reading

[../rules/17-eslint-typescript.md](../rules/17-eslint-typescript.md),
[../docs/eslint/README.md](../docs/eslint/README.md) (what each `architecture/*` rule
means and its exact valid/invalid shapes).

## Preconditions

- You have the actual failure output (`npm run lint`, `npm run typecheck`,
  `npm run typecheck:tsc`) — never fix from memory of an error.

## Steps

1. `npm run lint:fix` first — ordering/imports/format autofix; commit what it changes
   (CI's lint job fails on uncommitted autofix diff).
2. Classify each remaining finding:
   - `architecture/*` → the code is in the wrong layer. Move or redesign it using the
     matching skill (component/container/hook/gateway/route/package-owner). Do not disable
     the rule.
   - `architecture/enforce-declaration-placement` → move every interface, type alias,
     enum-like set, and module constant into the matching `*.interfaces.ts`,
     `*.types.ts`, `*.enums.ts`, or `*.constants.ts` owner. Apply this to old code too;
     do not merely fix the newest declaration.
   - Type error → fix the types truthfully. It must compile under BOTH TS 7.0.2
     (`npm run typecheck`) and TS 5.9.3 (`npm run typecheck:tsc`); if the versions
     disagree, find the shape both accept — do not fork behavior by version.
   - Third-party rule (sonarjs/unicorn/security/...) → prefer the code change; a config-
     level exemption needs a justifying comment in `eslint.config.js` (pattern: the
     existing documented blocks) and, for anything boundary-related, an exception doc.
3. Re-run the failing command narrowly, then the full pair of typechecks + lint.
4. If a fix moved files, re-run madge/knip (`npm run quality:circular`,
   `npm run quality:dead-code`).

## Forbidden shortcuts

- `eslint-disable` for `architecture/*` (never), or undocumented disables for anything else.
- `any`, `as unknown as`, `@ts-expect-error` to silence the compiler.
- Deleting/weakening a test because the lint plugin flagged it.
- Converting a module constant into a function-local duplicate to evade declaration
  placement; give the shared value its truthful owner file.
- Loosening `tsconfig.app.json` strictness or widening config `ignores`.

## Required tests

Existing suites stay green — a lint/type fix that changes runtime behavior is a behavior
change and needs its own test.

## Validation

```bash
npm run lint:fix && npm run lint
npm run typecheck && npm run typecheck:tsc
npm run test
```

## Definition of done

Zero errors and zero warnings across lint + both typechecks, autofixes committed, zero new
suppressions, suites green.
