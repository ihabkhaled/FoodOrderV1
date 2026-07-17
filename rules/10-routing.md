# 10 — Routing

## Rule

Route paths are owned by typed constants/builders in `routes/` files (`*.routes.tsx` /
route-constants files) — one route table per module, composed by `src/app`'s router. Inline
absolute path literals in `to=`, `href=`, or `navigate()` are forbidden outside route-owner
files. Router APIs come only from `@/packages/router`.

## Motivation

The pre-migration tree had inline `'/...'` literals in ~16 files; renaming a path was a
repo-wide grep. Typed builders (`orderDetailsRoute(orderId)`) make paths refactorable and
parameter usage type-checked.

## Required

- The real route map (target ownership):
  - `auth`: `/auth`, `/auth/login`, `/auth/register`, `/auth/forgot` (guest-only layout).
  - `dashboard`: `/` (index).
  - `buckets`: `/buckets`, `/buckets/new`, `/buckets/:bucketId/edit`.
  - `orders`: `/orders`, `/orders/:orderId`, `/buckets/:bucketId/order`.
  - `group-orders`: `/buckets/:bucketId/collaborate`, `/buckets/:bucketId/share`, `/join`.
  - `social`: `/social`, `/buckets/:bucketId/social-share`.
  - `settings`: `/settings`. Catch-all `*` → not-found (app shell).
- Each module's `routes/` exports path constants, param-typed builders, and the module's
  `<Route>` fragment; `src/app` assembles them with the guard layouts (protected vs guest).
- Auth guards redirect via constants (`/auth/login`, `/`), owned by their route files.

## Forbidden

- Inline absolute route strings anywhere outside `routes/` files
  (`architecture/no-inline-route-strings`).
- Importing `react-router-dom` directly (owner: `src/packages/router`).
- `useNavigate` outside hook files — wrap navigation in a project hook.
- Duplicating another module's path constant instead of importing it from that module's
  public surface.

## Enforcement

- `architecture/no-inline-route-strings`, `architecture/no-raw-package-imports`,
  `architecture/no-hooks-outside-hook-files` (error).
- Playwright journeys exercise real navigation on every PR.

## Definition of done

New/changed routes have constants + builders, appear in the module route table, are covered
by an e2e journey (or the smoke spec), and `npm run lint` shows zero inline-route errors.
[../context/routing-map.md](../context/routing-map.md) is updated.
