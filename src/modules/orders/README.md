# orders

Personal order lifecycle: browsing, details, creation from a bucket, and
status transitions (draft → placed → completed/cancelled).

## Responsibility

- The `/orders` screen: virtualized, cursor-paginated order list with search
  and status filters, plus deletion.
- The `/orders/:orderId` screen: line/charges summary, group receipt and
  participants (for group orders), notes, metadata, repeat + transitions.
- The `/buckets/:bucketId/order` screen: personal order composition with a
  live receipt preview.

## Public exports (`@/modules/orders`)

- `ordersRoutes` — route descriptors mounted by the app shell.
- `ORDERS_PATH`, `buildOrderDetailsRoute(orderId)`,
  `buildCreateOrderRoute(bucketId)` — absolute navigation targets owned by
  this module.
- `StatusBadge` — status pill, also consumed by the dashboard module.

## Structure

- `containers/` — thin screens: one view-model hook call + prepared JSX.
- `hooks/` — `use-orders.hook.ts` (pagination + filters + delete),
  `use-order-details.hook.ts` (load + transition + repeat),
  `use-create-order.hook.ts` (quantities + receipt preview + submit).
- `components/` — presentational pieces (order row, action bar, participants
  section, line summary, status badge).
- `routes/` — path constants + route descriptors (`BUCKETS_REDIRECT_PATH` is
  a local copy because buckets imports orders, not the other way around).

## Dependencies

`@/modules/data-access` (dataService, paginationService,
orderLifecycleService, domain helpers), `@/modules/group-orders`
(translateGroupOrder, GroupReceiptSection), `@/modules/session` (useApp),
`@/packages/{router,icons,virtuoso}`, `@/shared/{ui,i18n,helpers,types}`.

## Testing

Covered end-to-end by `tests/e2e/order-lifecycle.spec.ts` and the order
placement flows in `tests/e2e/group-order.spec.ts` (chromium); domain rules
live in `tests/domain` and `tests/order-repeat.test.ts`.
