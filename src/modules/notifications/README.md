# notifications

The in-app notification center (bell trigger, unread badge, dropdown panel).

## Responsibility

- Toggling the panel, closing it on outside pointer-down
  (`@/platform/browser` `subscribeToPointerDown`), marking notifications
  read, and navigating to a notification's target route.
- Rendering the notification list with locale-aware timestamps.

State ownership note: the notification subscription itself (list + markRead)
lives with the caller (currently the legacy `AppLayout`), which passes
`notifications` and `onMarkRead` down as props.

## Public exports (`@/modules/notifications`)

- `NotificationCenter` — container component
  (`notifications`, `locale`, `placement`, `onMarkRead` props).

## Structure

- `components/notification-center/` — container (hook call + prop wiring)
  and pure view component (zero hooks).
- `hooks/use-notification-center.hook.ts` — open state, outside-click
  subscription, mark-read and navigation handlers.

## Dependencies

`@/modules/data-access` (AppNotification/Locale types), `@/modules/social`
(translateSocial catalog), `@/packages/{router,icons}`, `@/platform/browser`.

## Testing

Exercised by `tests/e2e/social-management.spec.ts` and
`tests/e2e/social-sharing.spec.ts` (badge, panel, mark-read flows).
