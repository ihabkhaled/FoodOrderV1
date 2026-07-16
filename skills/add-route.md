# Skill: add a route

## Required reading

[../rules/10-routing.md](../rules/10-routing.md),
[../context/routing-map.md](../context/routing-map.md).

## Preconditions

- The owning module is clear (path semantics decide: `/buckets/:bucketId/collaborate`
  belongs to group-orders even though the path starts with `/buckets`).
- Auth posture decided: protected (app shell) or guest-only (`/auth/*` layout).

## Steps

1. In the module's `routes/` file, add the path constant and, for parameterized paths, a
   typed builder: `export const orderDetailsRoute = (orderId: string) => ...`.
2. Add the `<Route>` entry to the module's route fragment (`*.routes.tsx`), mounting the
   container.
3. If this is the module's first route, register the fragment in the `src/app` router under
   the correct guard layout.
4. Update navigation sources (shell nav, cards, redirects) to use the new constant/builder
   — imported from the module surface when crossing modules.
5. Update [../context/routing-map.md](../context/routing-map.md).

## Forbidden shortcuts

- Inline `'/...'` in `to=`, `href=`, or `navigate()` anywhere outside `routes/` files.
- Importing `react-router-dom` directly (use `@/packages/router`).
- Duplicating the path string in another module instead of importing the builder.
- Skipping the not-found/guard behavior check.

## Required tests

An e2e assertion that reaches the route through real navigation (not URL-only) and one for
the guard (unauthenticated access redirects to `/auth/login` for protected routes).

## Validation

```bash
npm run lint && npm run typecheck && npm run typecheck:tsc
npm run test:e2e
```

## Definition of done

Route reachable in the running app, guarded correctly, path owned by exactly one `routes/`
file, zero inline-route lint errors, routing map updated.
