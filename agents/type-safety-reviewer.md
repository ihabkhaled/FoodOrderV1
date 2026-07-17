# Type safety reviewer

Scope: types, contracts, compiler/lint configuration. Rules:
[../rules/07](../rules/07-types-interfaces-enums-constants.md),
[../rules/17](../rules/17-eslint-typescript.md).

## Checklist

- [ ] Compiles under BOTH toolchains: `npm run typecheck` (TS 7.0.2) and
      `npm run typecheck:tsc` (TS 5.9.3).
- [ ] No `any`, `as unknown as`, non-null assertions, `@ts-expect-error`/`@ts-ignore` in
      application source (test files only within their configured allowance).
- [ ] No `enum`; `as const` objects with derived unions in `*.enums.ts`.
- [ ] `tsconfig.app.json` strictness untouched (`strict`, `noUncheckedIndexedAccess`,
      `exactOptionalPropertyTypes`, `noImplicitOverride`, ...).
- [ ] Type-only imports use `import type`; type artifacts live in correctly suffixed files
      (`.types.ts` / `.interfaces.ts` / `.enums.ts` / `.constants.ts`).
- [ ] Persisted domain shapes defined once in `data-access` and reused by both gateways —
      no per-backend duplicate types drifting apart.
- [ ] Contracts are interfaces consumers depend on; concrete gateway classes not exported
      across module surfaces.
- [ ] External data (Firestore documents, storage JSON, env) is validated/narrowed at the
      boundary, not blindly cast to domain types.
- [ ] Message-key unions still derive from the catalogs (i18n completeness stays a compile
      error).
- [ ] `eslint.config.js` / tsconfig diffs: no severity downgrades, no widened ignores, no
      new parser scope holes; each exemption commented and justified.

## Blocking question

Does any type in this diff claim more certainty than the runtime guarantees (an unvalidated
cast at a boundary)? That is where tomorrow's production error lives.
