# Skill: refactor a legacy component (migration)

Move one legacy file (from `src/components`, `src/pages`, `src/services`, `src/state`,
`src/hooks`, `src/lib`, `src/config`, `src/i18n`, `src/types`) into the layered tree —
behavior-preserving.

## Required reading

[../docs/migration/architecture-violation-inventory.md](../docs/migration/architecture-violation-inventory.md)
(the file's known violations),
[../docs/migration/module-migration-status.md](../docs/migration/module-migration-status.md)
(target destination), [../rules/02-feature-modules.md](../rules/02-feature-modules.md),
[../rules/18-file-naming.md](../rules/18-file-naming.md).

## Preconditions

- The target module/layer for this file is listed in module-migration-status.md.
- Its safety net exists: identify the unit tests and/or e2e journey covering it BEFORE
  moving. If nothing covers it, add characterization coverage first (rule 33 — no rewrite
  of working logic without tests).
- Its dependencies' new homes exist or migrate in the same change (avoid legacy↔new
  back-references).

## Steps

1. Run the covering suites and record green (baseline).
2. `git mv` into the destination with kebab-case + suffix
   (`src/pages/OrdersPage.tsx` → `src/modules/orders/containers/orders-page.container.tsx`).
3. Split by responsibility — this is where the inventory's violations get fixed:
   - hook calls → extracted `hooks/use-<x>.hook.ts` view-model;
   - markup → `components/*.component.tsx` (zero hooks);
   - inline route strings → the module's `routes/` constants;
   - raw vendor imports → `@/packages/*` facades;
   - browser globals → `src/platform` calls;
   - interfaces → sibling `*.interfaces.ts`;
   - type aliases → sibling `*.types.ts`;
   - enum-like sets → sibling `*.enums.ts`;
   - module constants/lookups/regular expressions → sibling `*.constants.ts`;
   - hardcoded copy → catalog keys ([add-i18n-key.md](add-i18n-key.md)).
4. Restructure, do not rewrite: identical behavior, same message keys, same data flow.
5. Move its tests alongside, update imports, and re-run the baseline suites.
6. Update the consuming imports (old path dies); when a legacy directory empties, delete it.
7. Tick the module-migration-status row; note lessons in
   [../memory/migration-lessons.md](../memory/migration-lessons.md) if any.

## Forbidden shortcuts

- "Improving" behavior mid-move (bug fixes are separate commits with their own tests).
- Leaving a re-export shim at the legacy path longer than the same PR.
- Moving a file without its tests, or disabling architecture rules to make the old shape
  fit the new location.
- Carrying old inline declarations into the layered tree; migration is where declaration
  ownership and hook isolation become compliant.
- Migrating half a file (one component of two) and leaving a cross-referencing twin behind.

## Required tests

The pre-move covering suites, green after the move — plus any new unit tests created by the
split (extracted helpers/hooks).

## Validation

```bash
npm run lint:fix && npm run lint
npm run typecheck && npm run typecheck:tsc
npm run test && npm run test:e2e
npm run quality:circular && npm run quality:dead-code && npm run build
```

## Definition of done

File lives in its final home fully rule-compliant, baseline suites green, no legacy
back-references, status table updated, and behavior byte-for-byte equivalent to the user.
