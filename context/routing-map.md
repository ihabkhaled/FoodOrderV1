# Routing map

Real route table (from the shipped router; legacy `src/App.tsx` until `src/app/router`
lands) with target ownership. Rule: [../rules/10-routing.md](../rules/10-routing.md).

## Guest-only (auth layout, redirects authenticated users to `/`)

| Path             | Screen                      | Owner module |
| ---------------- | --------------------------- | ------------ |
| `/auth`          | index → redirect to `login` | auth         |
| `/auth/login`    | Login                       | auth         |
| `/auth/register` | Register                    | auth         |
| `/auth/forgot`   | Forgot password             | auth         |

## Protected (app shell, redirects guests to `/auth/login`)

| Path                              | Screen                       | Owner module |
| --------------------------------- | ---------------------------- | ------------ |
| `/`                               | Dashboard                    | dashboard    |
| `/buckets`                        | Bucket list                  | buckets      |
| `/buckets/new`                    | Bucket editor (create)       | buckets      |
| `/buckets/:bucketId/edit`         | Bucket editor (edit)         | buckets      |
| `/buckets/:bucketId/order`        | Create order from bucket     | orders       |
| `/buckets/:bucketId/collaborate`  | Group-order collaboration    | group-orders |
| `/buckets/:bucketId/share`        | Share / join-code management | group-orders |
| `/buckets/:bucketId/social-share` | Social share                 | social       |
| `/join`                           | Join bucket by code          | group-orders |
| `/social`                         | Social feed/management       | social       |
| `/orders`                         | Order list                   | orders       |
| `/orders/:orderId`                | Order details                | orders       |
| `/settings`                       | Runtime preferences          | settings     |

## Fallback

| Path | Screen    | Owner     |
| ---- | --------- | --------- |
| `*`  | Not found | app shell |

## Ownership mechanics (target)

- Each module's `routes/*.routes.tsx` exports path constants, param-typed builders
  (`orderDetailsRoute(orderId)`), and its `<Route>` fragment; `src/app/router` composes
  fragments under the two guard layouts.
- Ownership follows semantics, not path prefix: `/buckets/:bucketId/collaborate` belongs
  to group-orders; `/buckets/:bucketId/order` to orders.
- Cross-module navigation imports the target module's builder from its public surface.
- Guard redirect targets (`/auth/login`, `/`) are constants owned by auth/dashboard routes.
- Inline `'/...'` literals outside `routes/` files are lint errors
  (`architecture/no-inline-route-strings`).

Update this map in the same change as any route addition
([../skills/add-route.md](../skills/add-route.md)).
