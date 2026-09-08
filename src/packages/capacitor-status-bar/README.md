# capacitor-status-bar

Owned facade for `@capacitor/status-bar`.

## Responsibility

Isolates the rest of the app from the Capacitor status-bar SDK, per
[rules/08-package-ownership.md](../../../rules/08-package-ownership.md).

## Public exports (`@/packages/capacitor-status-bar`)

- `StatusBar` — native status-bar control API (show/hide, style, color).
- `Style` — enum of status bar styles (e.g. light/dark).

## Structure

- `index.ts` — single-file re-export; no adapting logic.

## Dependencies

None.

## Consumers

`@/platform/device/status-bar.adapter.ts` — modules never import this
package directly.

## Testing

None directly — the facade is a type-checked, one-line re-export with no
logic to unit test.
