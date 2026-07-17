# 07 — Types, interfaces, enums, constants

## Rule

Type artifacts are declared in suffix-named files: `*.types.ts` (type aliases, unions,
utility types), `*.interfaces.ts` (contracts/object shapes), `*.enums.ts` (`as const`
objects with derived unions — the `enum` keyword is banned), `*.constants.ts` (runtime
constants). Persisted domain model types live in `src/modules/data-access`.

## Motivation

`enum` generates runtime objects with non-obvious semantics (numeric reverse maps, no
tree-shaking) and behaves differently across the two TypeScript versions this repo checks
under. `as const` objects are erasable, exact, and idiomatic under `isolatedModules`.

## Required

- Enum pattern:

  ```ts
  // order-status.enums.ts
  export const OrderStatus = {
    Draft: "draft",
    Placed: "placed",
    Completed: "completed",
    Cancelled: "cancelled",
  } as const;
  export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
  ```

- `import type` for type-only imports (`@typescript-eslint/consistent-type-imports` is on).
- Shared cross-module domain types exported through `@/modules/data-access`; module-private
  types stay inside the module.
- Strict compiler settings stay intact: `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride` (see `tsconfig.app.json`).

## Forbidden

- `enum` / `const enum` anywhere in the layered tree.
- `any`, `as unknown as`, or non-null assertions in application source to silence the
  compiler (test files have a narrow, configured exemption).
- Duplicate domain-type definitions per backend — one persisted model, two gateways.
- Loosening `tsconfig` to make code compile.

## Enforcement

- `architecture/no-typescript-enum` (error), `architecture/enforce-file-suffixes`.
- `tseslint.configs.strictTypeChecked`; dual typecheck in CI (`typecheck-primary` on
  TS 7.0.2, `typecheck-compatibility` on TS 5.9.3).

## Definition of done

`npm run typecheck` and `npm run typecheck:tsc` both pass, lint is clean, and every new
type artifact lives in a correctly suffixed file inside its owning layer.
