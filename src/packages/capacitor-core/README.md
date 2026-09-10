# capacitor-core

Owned facade for `@capacitor/core`.

## Responsibility

Isolates the rest of the app from the Capacitor runtime SDK, per
[rules/08-package-ownership.md](../../../rules/08-package-ownership.md): a
package owner never imports project code, and application code never
imports the raw npm package directly (enforced by the
`architecture/no-raw-package-imports` ESLint rule, registered in
[eslint/package-ownership.config.mjs](../../../eslint/package-ownership.config.mjs)).

## Public exports (`@/packages/capacitor-core`)

- `Capacitor` — the Capacitor runtime object, re-exported as-is. Used for
  native/web platform detection.

## Structure

- `index.ts` — single-file re-export; no adapting logic.

## Dependencies

None. Package owners never import `@/modules`, `@/platform`, `@/shared`, or
other `@/packages`.

## Consumers

`@/platform/device` (`haptics.adapter.ts`, `runtime-platform.adapter.ts`,
`status-bar.adapter.ts`) — modules never import this package directly; they
go through `@/platform` per
[context/package-ownership.md](../../../context/package-ownership.md).

## Testing

None directly — the facade is a type-checked, one-line re-export with no
logic to unit test (see
[skills/create-package-owner.md](../../../skills/create-package-owner.md)).
Exercised indirectly through the `@/platform/device` adapters that consume it.
