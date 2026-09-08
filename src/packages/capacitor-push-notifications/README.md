# capacitor-push-notifications

Owned facade for `@capacitor/push-notifications`.

## Responsibility

Isolates the rest of the app from the Capacitor push-notifications SDK, per
[rules/08-package-ownership.md](../../../rules/08-package-ownership.md).

## Public exports (`@/packages/capacitor-push-notifications`)

- `PushNotifications` — push registration/permission/listener API.

## Structure

- `index.ts` — single-file re-export; no adapting logic.

## Dependencies

None.

## Consumers

`@/platform/device/push-registration.adapter.ts` — modules never import this
package directly.

## Testing

None directly — the facade is a type-checked, one-line re-export with no
logic to unit test.
