# 02 — Feature modules

## Rule

Every feature owns exactly one directory under `src/modules/` with a single public surface
(`index.ts`). The module set is: `auth`, `buckets`, `group-orders`, `orders`, `social`,
`notifications`, `dashboard`, `settings`, plus the two infrastructure modules `session`
(app-wide user/session/toast/locale state provider) and `data-access` (persisted domain
model types, service contracts, dual cloud/local persistence gateways, storage-mode
selection — see EXC-1).

## Motivation

Module ownership answers "where does this code live?" mechanically. The legacy layout
required knowing 9 top-level directories per feature; the module layout requires knowing
one name.

## Required

- Internal anatomy by responsibility (see [../context/module-anatomy.md](../context/module-anatomy.md)):
  `components/`, `containers/`, `hooks/`, `routes/`, `services/`, `helpers/`, `types/`
  (create only the layers the module needs — no empty placeholder directories).
- `index.ts` exports the minimal public API: route table, container entry points, and any
  types other modules legitimately consume.
- Feature-specific i18n catalogs stay module-owned (e.g. the social catalog migrates from
  `src/i18n/socialMessages.ts` into `src/modules/social`); the core `translate` engine
  lives in `src/shared/i18n`.
- A module README describing its responsibility (per
  [../docs/migration/module-migration-status.md](../docs/migration/module-migration-status.md)
  definition of done).

## Forbidden

- Importing another module's internals (`@/modules/buckets/helpers/bucket.helper`) — only
  `@/modules/buckets`.
- Module-to-module cycles. Feature modules depend on `session` and `data-access` one-way;
  `session` and `data-access` never import feature modules.
- Barrel files other than the module root `index.ts` re-exporting internals for outsiders.
- Placing feature logic in `src/shared` "for reuse" before two modules actually need it.

## Enforcement

- `architecture/no-cross-module-deep-imports`, `architecture/no-restricted-layer-imports`,
  `architecture/enforce-file-suffixes` — all error severity.
- `npm run quality:dead-code` (knip) flags unused exports on public surfaces.

## Definition of done

The module builds, lints, and typechecks clean; its `index.ts` is the only import path used
by other code (`Grep` for `@/modules/<name>/` proves no deep imports); existing tests moved
with the code and stay green; `docs/migration/module-migration-status.md` row updated.
