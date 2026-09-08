# capacitor-preferences

Owned facade for `@capacitor/preferences`.

## Responsibility

Isolates the rest of the app from the Capacitor preferences SDK, per
[rules/08-package-ownership.md](../../../rules/08-package-ownership.md).

## Public exports (`@/packages/capacitor-preferences`)

- `Preferences` — native key-value storage API (get/set/remove/clear).

## Structure

- `index.ts` — single-file re-export; no adapting logic.

## Dependencies

None.

## Consumers

`@/platform/storage/preferences.adapter.ts` — modules never import this
package directly.

## Testing

None directly — the facade is a type-checked, one-line re-export with no
logic to unit test. `tests/eslint/architecture-plugin.test.ts` uses a fixture
string referencing this package to test the raw-import-ban lint rule, not the
facade's behavior.
