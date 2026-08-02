# notifications

The in-app notification center (bell trigger, unread badge, dropdown panel).

## Responsibility

- Toggling the panel, closing it on outside pointer-down
  (`@/platform/browser` `subscribeToPointerDown`), marking notifications
  read, and navigating to a notification's target route.
- Rendering the notification list with locale-aware timestamps, including a
  per-section loading placeholder until the first payload arrives.

State ownership note: the notification subscription itself (list + markRead)
lives with the caller (`src/app/shell`), which passes `notifications`,
`loading`, and `onMarkRead` down as props.

## OS tray mirroring (v1.8.0)

This module renders the in-app centre only. Mirroring those notifications into
the operating-system tray is composed in `src/app/shell`:

- `src/app/shell/helpers/notification-mirror.helper.ts` decides which incoming
  notifications are genuinely new and unread. The first subscription payload is
  treated as history so signing in never replays the inbox.
- `use-app-layout.hook.ts` mirrors only while the app is **not** in front, asks
  for permission from a deliberate user action, and routes taps back into the
  app with the `notificationOpenSequence` state shape.
- Permission and tray adapters live in `src/platform/device`; the browser
  Notification API wrapper lives in `src/platform/browser`.

Remote push (app fully closed) is **not** implemented; prerequisites are listed
in [docs/operations/push-notifications.md](../../../docs/operations/push-notifications.md).

## Public exports (`@/modules/notifications`)

- `NotificationCenter` — container component
  (`notifications`, `loading`, `locale`, `placement`, `onMarkRead` props).

## Structure

- `components/notification-center/` — container (hook call + prop wiring)
  and pure view component (zero hooks).
- `hooks/use-notification-center.hook.ts` — open state, outside-click
  subscription, mark-read and navigation handlers.

## Dependencies

`@/modules/data-access` (AppNotification/Locale types), `@/modules/social`
(translateSocial catalog), `@/packages/{router,icons}`, `@/platform/browser`,
`@/shared/ui` (SkeletonSection).

## Testing

- `tests/components/NotificationCenter.test.tsx` — panel and mark-read wiring.
- `tests/domain/notification-mirror.test.ts` — which notifications mirror.
- `tests/e2e/notification-mirroring.spec.ts` — tray mirroring is suppressed
  while visible, fires exactly once when backgrounded.
- `tests/e2e/social-management.spec.ts`, `tests/e2e/social-sharing.spec.ts` —
  badge, panel, mark-read flows.
