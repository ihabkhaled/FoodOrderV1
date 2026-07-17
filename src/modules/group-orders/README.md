# group-orders

Collaborative group ordering on shared buckets: real-time contribution,
custom items, pricing policy, invites/permissions, and joining by code.

## Responsibility

- The `/buckets/:bucketId/collaborate` screen: debounced quantity
  contributions, drift detection/repair, custom item proposal and approval,
  placing the group order, and leaving the bucket.
- The `/buckets/:bucketId/share` screen: owner-only invite creation and
  revocation, member roles and custom-item permissions, freeze/reopen.
- The `/join` screen: preview and accept a join code.
- The group-order message catalog (`GroupOrderMessageKey` +
  `translateGroupOrder`), also consumed by the orders and buckets modules.

## Public exports (`@/modules/group-orders`)

- `groupOrdersRoutes` — route descriptors mounted by the app shell.
- `buildBucketCollaborateRoute(bucketId)`, `buildBucketShareRoute(bucketId)`,
  `JOIN_PATH` — absolute navigation targets owned by this module.
- `translateGroupOrder`, `GroupOrderMessageKey` — group-order i18n catalog.
- `BucketPricingPanel` (consumed by the buckets editor), `CustomItemPanel`,
  `GroupReceiptSection` (consumed by orders details and component tests).

## Structure

- `containers/` — thin screens: one view-model hook call + prepared JSX.
- `hooks/` — `use-bucket-collaborate.hook.ts` (load + debounced contribution
  sender + lifecycle actions), `use-bucket-share.hook.ts` (owner sharing
  view-model), `use-join-bucket.hook.ts` (code preview/accept).
- `components/` — presentational sections; `custom-item-panel` and
  `group-receipt-section` are container/hook/component splits because they
  own local state.
- `i18n/`, `routes/`.

group-orders imports no other feature module (buckets and orders both build
on it), so its `routes/group-orders-route-paths.constants.ts` owns local
redirect copies (`BUCKETS_REDIRECT_PATH`, `buildPlacedOrderRedirect`).

## Dependencies

`@/modules/data-access` (sharingService, domain helpers), `@/modules/session`
(useApp), `@/platform/browser` (clipboard/share), `@/packages/{router,icons}`,
`@/shared/{ui,i18n,helpers,types}`.

## Testing

`tests/components/GroupOrderComponents.test.tsx` (pricing panel, custom item
panel, receipt section) plus e2e `tests/e2e/group-order.spec.ts` and
`tests/e2e/bucket-pricing.spec.ts` (chromium).
