# Skill: create a container

## Required reading

[../rules/04-containers.md](../rules/04-containers.md),
[../rules/05-hooks-and-effects.md](../rules/05-hooks-and-effects.md),
[../rules/10-routing.md](../rules/10-routing.md).

## Preconditions

- The screen's behavior exists (or is being built) as a view-model hook in the module's
  `hooks/`; the markup exists as components.
- The route is owned by the module's `routes/` file.

## Steps

1. Create `src/modules/<name>/containers/<kebab-name>.container.tsx`.
2. Call the view-model hook(s): `const vm = useOrdersViewModel();` — project hooks only
   (module hooks + `@/modules/session` hooks).
3. Branch on state with shared UI: `Loading`, `ErrorState` (with retry), `EmptyState`,
   then the content components, passing `vm` data and callbacks down.
4. Navigation through typed builders from `routes/` (inside the hook or as constants —
   never inline `'/...'`).
5. Export the container from the module `index.ts` if `src/app`'s router mounts it.

## Forbidden shortcuts

- Calling `useState`/`useEffect`/`useNavigate`/`useParams` directly — wrap in a project
  hook first.
- Inlining business logic (calculations, permission checks) in the container body.
- Reaching past the view-model into gateways or `@/packages/firebase`.
- Growing bespoke JSX blocks that should be `*.component.tsx` files.

## Required tests

The owning Playwright journey covers the container's wiring (loading → content → actions →
navigation). Extend the module's spec in `tests/e2e/` if the flow is new
([write-e2e-tests.md](write-e2e-tests.md)).

## Validation

```bash
npm run lint && npm run typecheck && npm run typecheck:tsc
npm run test:e2e
```

## Definition of done

Container is thin wiring only; every hook it calls is project-owned; journey green on
chromium and mobile-chrome; zero architecture errors.
