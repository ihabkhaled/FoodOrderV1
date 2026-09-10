# virtuoso

Owned facade for `react-virtuoso`. The oldest facade in the repo (pre-1.6.0)
and the reference example
[skills/create-package-owner.md](../../../skills/create-package-owner.md)
points to when creating a new package owner.

## Responsibility

Isolates the rest of the app from the virtualized-list library, per
[rules/08-package-ownership.md](../../../rules/08-package-ownership.md).

## Public exports (`@/packages/virtuoso`)

- `AppTableVirtuosoHandle`, `AppVirtuosoGridHandle`, `AppVirtuosoHandle`
  (types) — renamed re-exports of `TableVirtuosoHandle`, `VirtuosoGridHandle`,
  `VirtuosoHandle`.
- `AppTableVirtuoso`, `AppVirtuoso`, `AppVirtuosoGrid` — renamed re-exports
  of `TableVirtuoso`, `Virtuoso`, `VirtuosoGrid` (virtualized list/table/grid
  components).

Unlike every other facade in this repo, exports are renamed with an `App`
prefix rather than re-exported as-is.

## Structure

- `index.ts` — single-file re-export; no adapting logic.

## Dependencies

None.

## Consumers

`src/modules/buckets/components/bucket-collection-section/bucket-collection-section.component.tsx`,
`src/modules/orders/containers/orders.container.tsx` — modules never import
`react-virtuoso` directly.

## Testing

None directly — the facade is a type-checked, renamed re-export with no
logic to unit test. Exercised indirectly through the buckets and orders
list screens that consume it.
