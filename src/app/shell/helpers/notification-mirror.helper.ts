import type { AppNotification } from '@/modules/data-access';

/**
 * Picks the notifications that just arrived unread and were not in the previous
 * list, so the OS tray mirrors each in-app notification exactly once.
 *
 * The first subscription payload is deliberately treated as history: mirroring
 * it would replay the whole inbox as tray notifications on every sign-in.
 */
export const selectNewUnreadNotifications = (
  previous: readonly AppNotification[] | null,
  next: readonly AppNotification[],
): AppNotification[] => {
  if (previous === null) return [];
  const known = new Set(previous.map((notification) => notification.id));
  return next.filter(
    (notification) => !notification.readAt && !known.has(notification.id),
  );
};
