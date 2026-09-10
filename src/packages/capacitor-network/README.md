# capacitor-network

Owned facade for `@capacitor/network`.

## Responsibility

Isolates the rest of the app from the Capacitor network SDK, per
[rules/08-package-ownership.md](../../../rules/08-package-ownership.md).

## Public exports (`@/packages/capacitor-network`)

- `Network` — network status/connectivity API (get current status, listen
  for changes).

## Structure

- `index.ts` — single-file re-export; no adapting logic.

## Dependencies

None.

## Consumers

`@/platform/network/network-status.adapter.ts` — modules never import this
package directly.

## Testing

None directly — the facade is a type-checked, one-line re-export with no
logic to unit test.
