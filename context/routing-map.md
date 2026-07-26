# Routing map

Real route table from the shipped module router with target ownership. Rule:
[../rules/10-routing.md](../rules/10-routing.md).

Web URLs are exposed as `/:locale<internal-path>` for all twelve locales. Examples:
`/en/app`, `/en/contact`, `/ar/auth/forgot`, and `/pt-br/orders`. The tables below show
locale-independent internal route constants. `src/main.tsx` selects the URL locale before
mounting `BrowserRouter` with that locale as its basename. Legacy unprefixed application
URLs normalize to English while preserving query parameters and fragments. Capacitor uses
the internal unprefixed paths.

## Guest-only (auth layout, redirects authenticated users to `/app`)

| Path             | Screen                      | Owner module |
| ---------------- | --------------------------- | ------------ |
| `/auth`          | index → redirect to `login` | auth         |
| `/auth/login`    | Login                       | auth         |
| `/auth/register` | Register                    | auth         |
| `/auth/forgot`   | Forgot password             | auth         |
| `/auth/action`   | Complete password reset      | auth         |

## Protected (app shell, redirects guests to `/auth/login`)

| Path                              | Screen                       | Owner module |
| --------------------------------- | ---------------------------- | ------------ |
| `/app`                            | Dashboard                    | dashboard    |
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
- Guard redirect targets (`/auth/login`, `/app`) are constants owned by auth/dashboard
  routes.
- Language changes persist the selected locale and reload the same internal screen under
  the new URL prefix. A password-reset `lang` query is honored when a legacy unprefixed
  email action URL is normalized.
- Only the reviewed public registry is indexable. Authenticated, invitation, shared-order,
  and other private URLs exist in every locale for navigation but are noindex and excluded
  from sitemaps/feeds.
- Inline `'/...'` literals outside `routes/` files are lint errors
  (`architecture/no-inline-route-strings`).

Update this map in the same change as any route addition
([../skills/add-route.md](../skills/add-route.md)).
