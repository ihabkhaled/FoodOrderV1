# capacitor-local-notifications

Owned facade for `@capacitor/local-notifications`.

## Responsibility

Isolates the rest of the app from the Capacitor local-notifications SDK, per
[rules/08-package-ownership.md](../../../rules/08-package-ownership.md).

## Public exports (`@/packages/capacitor-local-notifications`)

- `LocalNotifications` — the local/OS-tray notification scheduling API.

## Structure

- `index.ts` — single-file re-export; no adapting logic.

## Dependencies

None.

## Consumers

`@/platform/device/notification-permission.adapter.ts`,
`@/platform/device/tray-notification.adapter.ts` — modules never import this
package directly.

## Testing

None directly — the facade is a type-checked, one-line re-export with no
logic to unit test.
