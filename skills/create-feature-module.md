# Skill: create a feature module

## Required reading

[../rules/02-feature-modules.md](../rules/02-feature-modules.md),
[../rules/01-architecture-and-dependency-direction.md](../rules/01-architecture-and-dependency-direction.md),
[../context/module-anatomy.md](../context/module-anatomy.md), and one existing module as
reference (e.g. `src/modules/settings` for a simple one).

## Preconditions

- The feature is genuinely new — it does not belong inside auth, buckets, group-orders,
  orders, social, notifications, dashboard, or settings.
- Its data needs are expressible through existing `data-access` contracts, or the contract
  change is planned via [create-service-or-gateway.md](create-service-or-gateway.md).

## Steps

1. Create `src/modules/<kebab-name>/` with only the layers needed:
   `components/`, `containers/`, `hooks/`, `routes/`, `helpers/`, `types/`.
2. Define route constants/builders in `routes/<name>.routes.tsx` and the module `<Route>`
   fragment ([add-route.md](add-route.md)).
3. Build inside-out: helpers (pure) → hooks (view-model, consuming `@/modules/data-access`
   and `@/modules/session`) → components (UI-only) → container → routes.
4. Write `index.ts` exporting only the public surface (route table, container entry,
   shared types). Add a short module `README.md` (one paragraph: responsibility + surface).
5. Register the route fragment in the `src/app` router.
6. Add i18n keys for all copy ([add-i18n-key.md](add-i18n-key.md)), tests
   ([write-unit-tests.md](write-unit-tests.md), [write-e2e-tests.md](write-e2e-tests.md)).
7. Update [../docs/migration/module-migration-status.md](../docs/migration/module-migration-status.md)
   and [../context/architecture-map.md](../context/architecture-map.md); run
   `npm run knowledge:build:incremental`.

## Forbidden shortcuts

- Empty placeholder directories or a barrel that re-exports internals wholesale.
- Importing another module's internals instead of its surface.
- Parking "temporarily shared" code in `src/shared` before two modules need it.
- Creating a module-level context when session + props suffice.

## Required tests

Unit tests for every helper/hook with pure logic; an e2e journey (or extension of an
existing spec) for the screen; both locales exercised at least by RTL smoke.

## Validation

```bash
npm run lint && npm run typecheck && npm run typecheck:tsc
npm run test && npm run build
npm run quality:circular && npm run quality:dead-code
npm run test:e2e
```

## Definition of done

Module lints/typechecks/tests green; only `index.ts` imported from outside; routes owned by
`routes/`; docs and knowledge rebuilt; zero architecture-rule suppressions.
