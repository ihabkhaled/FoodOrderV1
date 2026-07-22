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

- Every named declaration is owned by its suffix:
  - `interface` declarations live only in `*.interfaces.ts`;
  - type aliases, unions, and utility types live only in `*.types.ts`;
  - an `as const` value set and its derived union may live together in
    `*.enums.ts`;
  - module-scope runtime values live in `*.constants.ts` (or `*.enums.ts`
    for a value set).
- Components, containers, hooks, helpers, gateways, adapters, and route files import
  those artifacts from sibling owner files. They do not declare their props contracts,
  view-model interfaces, state unions, limits, lookup tables, regular expressions, or
  other module constants inline.
- Ordinary function-local `const` bindings for runtime calculations are variables, not
  architectural constants, and remain with the behavior that computes them.

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
- Named interfaces or type aliases inside `*.component.tsx`, `*.container.tsx`,
  `*.hook.ts`, `*.helper.ts`, `*.gateway.ts`, `*.adapter.ts`, or any other
  non-declaration owner.
- Props interfaces declared beside JSX, view-model interfaces declared beside hooks, or
  exported limits/lookup tables declared in behavior files.
- Placing an interface in `*.types.ts`, or a type alias in `*.interfaces.ts` /
  `*.constants.ts`; the suffix must match the declaration kind.
- `any`, `as unknown as`, or non-null assertions in application source to silence the
  compiler (test files have a narrow, configured exemption).
- Duplicate domain-type definitions per backend — one persisted model, two gateways.
- Loosening `tsconfig` to make code compile.

## Enforcement

- `architecture/no-typescript-enum`,
  `architecture/enforce-declaration-placement`, and
  `architecture/enforce-file-suffixes` (error).
- `tseslint.configs.strictTypeChecked`; dual typecheck in CI (`typecheck-primary` on
  TS 7.0.2, `typecheck-compatibility` on TS 5.9.3).

## Definition of done

`npm run typecheck` and `npm run typecheck:tsc` both pass, lint is clean, and every
named declaration lives in a correctly suffixed owner file inside its owning layer.
