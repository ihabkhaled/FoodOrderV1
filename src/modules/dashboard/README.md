# dashboard

The home screen (index route): welcome hero, stat cards, and recent orders.

## Responsibility

- Loads the dashboard summary (`dataService.getDashboard`) with pull-to-refresh
  support and error/retry handling.
- Stat cards deep-link into the buckets and orders screens using those
  modules' route constants.
- Recent orders list with status badges linking to order details.

## Public exports (`@/modules/dashboard`)

- `dashboardRoutes` — the index route descriptor mounted by the app shell.

## Structure

- `containers/dashboard.container.tsx` — one view-model hook call + hero JSX,
  builds the stat card list from the summary.
- `hooks/use-dashboard.hook.ts` — summary load state + page refresh.
- `components/dashboard-stat-grid/` — pure stat card grid.
- `components/recent-orders-section/` — recent orders region.
- `routes/` — index route descriptor (no owned path constants).

## Dependencies

`@/modules/data-access` (dataService, DashboardSummary), `@/modules/session`
(useApp), `@/modules/buckets` (BUCKETS_PATH, BUCKET_NEW_PATH),
`@/modules/orders` (ORDERS_PATH, buildOrderDetailsRoute, StatusBadge),
`@/packages/{router,icons}`, `@/shared/{ui,i18n,helpers,types}`.

## Testing

Covered by the dashboard flows in `tests/e2e/smoke.spec.ts` and
`tests/e2e/ui.spec.ts` (chromium).
