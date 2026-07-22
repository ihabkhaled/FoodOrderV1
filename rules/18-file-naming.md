# 18 — File naming

## Rule

Every file in the layered tree (`src/app`, `src/modules`, `src/shared`, `src/platform`,
`src/packages`) is kebab-case and declares its responsibility with a suffix. Exempt:
`index.ts`, `main.tsx`, `*.d.ts`.

## Motivation

The suffix is machine-checked metadata: it selects which hook/layer rules apply to the file
(components get the zero-hook rule, containers the project-hooks-only rule) and makes a
directory listing self-describing.

## Required

Allowed suffixes (from `architecture/enforce-file-suffixes`):

| Kind             | Suffixes                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| React            | `.component.tsx`, `.container.tsx`, `.provider.tsx`, `.routes.tsx`                                       |
| Behavior         | `.hook.ts`                                                                                               |
| Data/integration | `.service.ts`, `.gateway.ts`, `.repository.ts`, `.queries.ts`, `.mutations.ts`, `.api.ts`, `.adapter.ts` |
| State            | `.store.ts`, `.selectors.ts`                                                                             |
| Domain/support   | `.schema.ts`, `.mapper.ts`, `.helper.ts`, `.utils.ts`, `.factory.ts`                                     |
| Declarations     | `.constants.ts`, `.types.ts`, `.interfaces.ts`, `.enums.ts`, `.variants.ts`, `.errors.ts`                |

Examples: `order-row.component.tsx`, `orders-page.container.tsx`,
`use-bucket-mutations.hook.ts`, `firestore-order.gateway.ts`, `order-status.enums.ts`,
`bucket.routes.tsx`.

- Pick the suffix by responsibility, then the rule set for that suffix applies
  ([03](03-components.md), [04](04-containers.md), [05](05-hooks-and-effects.md),
  [06](06-services-and-gateways.md), [07](07-types-interfaces-enums-constants.md)).
- Directories are kebab-case, plural for collections (`components/`, `hooks/`, `routes/`).
- Declaration suffixes are exclusive owners: interfaces only in `*.interfaces.ts`, type
  aliases only in `*.types.ts`, enum-like `as const` sets in `*.enums.ts`, and
  module-scope runtime constants in `*.constants.ts`. Behavior files import them.

## Forbidden

- PascalCase/camelCase filenames in the layered tree (legacy `BucketEditorPage.tsx` style
  ends at migration).
- Suffix-less `.ts`/`.tsx` files (other than the exempt three).
- Lying suffixes — a `.helper.ts` that performs I/O, a `.component.tsx` exporting a hook.
- Inline declarations in behavior files, including props interfaces in components,
  view-model aliases in hooks, and lookup/message constants in helpers or adapters.
- Multi-responsibility files (two gateways, two components) — one unit per file.

## Enforcement

- `architecture/enforce-file-suffixes`,
  `architecture/enforce-declaration-placement`, and `unicorn/filename-case`
  (kebab-case), all error on the layered paths.

## Definition of done

`npm run lint` passes on the new/renamed files; git history preserved on renames
(`git mv`, rename detected); imports updated everywhere (typecheck proves it).
