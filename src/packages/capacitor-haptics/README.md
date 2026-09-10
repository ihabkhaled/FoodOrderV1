# capacitor-haptics

Owned facade for `@capacitor/haptics`.

## Responsibility

Isolates the rest of the app from the Capacitor haptics SDK, per
[rules/08-package-ownership.md](../../../rules/08-package-ownership.md).

## Public exports (`@/packages/capacitor-haptics`)

- `Haptics` — the haptics plugin API (impact/vibration triggers).
- `ImpactStyle` — enum of impact intensity styles used with
  `Haptics.impact()`.

## Structure

- `index.ts` — single-file re-export; no adapting logic.

## Dependencies

None.

## Consumers

`@/platform/device/haptics.adapter.ts` — modules never import this package
directly.

## Testing

None directly — the facade is a type-checked, one-line re-export with no
logic to unit test. `tests/eslint/architecture-plugin.test.ts` uses a fixture
string referencing `@capacitor/haptics` to test the raw-import-ban lint rule,
not the facade's behavior.
