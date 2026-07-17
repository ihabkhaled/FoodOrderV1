# buckets

Bucket management: the paginated owned/shared bucket collections and the
bucket editor (items, currency, pricing policy).

## Responsibility

- The `/buckets` screen: cursor-paginated owned and shared collections with
  search/scope filters, duplicate and delete mutations, and entry points to
  join/create flows.
- The `/buckets/new` and `/buckets/:bucketId/edit` screens: bucket form with
  item list editing and the group-order pricing panel.
- Bucket cards navigate into the collaborate/share flows
  (`@/modules/group-orders`), personal ordering (`@/modules/orders`), and
  social sharing (`@/modules/social`) via those modules' route builders.

## Public exports (`@/modules/buckets`)

- `bucketsRoutes` — route descriptors mounted by the app shell.
- `BUCKETS_PATH`, `BUCKET_NEW_PATH` — absolute navigation targets owned by
  this module (consumed by the app layout and dashboard).

## Structure

- `containers/` — thin screens: one view-model hook call + prepared JSX.
- `hooks/` — `use-buckets.hook.ts` (dual cursor pagination + filters),
  `use-bucket-editor.hook.ts` (form state + submit),
  `use-bucket-mutations.hook.ts` (delete/duplicate, shared by the list).
- `components/` — presentational pieces (owned/shared cards, virtualized
  collection section, filters, results region).
- `routes/` — path constants + route descriptors.

## Dependencies

`@/modules/data-access` (dataService, paginationService, domain types),
`@/modules/{group-orders,orders,social}` (route builders, pricing panel),
`@/modules/session` (useApp), `@/platform/device` (SUPPORTED_CURRENCIES),
`@/packages/{router,icons,virtuoso}`, `@/shared/{ui,i18n,helpers,types}`.

## Testing

Covered end-to-end by `tests/e2e/bucket-pricing.spec.ts`,
`tests/e2e/group-order.spec.ts`, and the bucket flows in
`tests/e2e/smoke.spec.ts` / `tests/e2e/ui.spec.ts` (chromium).
