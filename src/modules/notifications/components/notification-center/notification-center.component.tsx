import type { Locale } from '@/modules/data-access';
import { Bell, CheckCheck } from '@/packages/icons';

import type { NotificationCenterViewProps } from './notification-center.types';

const formatTimestamp = (locale: Locale, timestamp: string): string =>
  new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));

export function NotificationCenterView({
  notifications,
  locale,
  placement,
  open,
  rootRef,
  unreadCount,
  s,
  onToggle,
  onMarkAllRead,
  onOpenNotification,
}: NotificationCenterViewProps) {
  return (
    <div
      className={`notification-center notification-${placement}`}
      ref={rootRef}
    >
      <button
        className="icon-button notification-trigger"
        type="button"
        title={s('notifications')}
        aria-label={s('notifications')}
        aria-expanded={open}
        onClick={onToggle}
      >
        <Bell />
        {unreadCount > 0 ? (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <section className="notification-panel" aria-label={s('notifications')}>
          <header className="notification-panel-head">
            <div>
              <strong>{s('notifications')}</strong>
              <span className="muted">
                {unreadCount} {s('unreadNotifications')}
              </span>
            </div>
            <button
              className="button secondary notification-read-all"
              type="button"
              disabled={unreadCount === 0}
              onClick={onMarkAllRead}
            >
              <CheckCheck />
              {s('markAllRead')}
            </button>
          </header>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <p className="notification-empty muted">{s('noNotifications')}</p>
            ) : (
              notifications.map((notification) => (
                <button
                  className={`notification-item${notification.readAt ? '' : ' unread'}`}
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    onOpenNotification(notification);
                  }}
                >
                  <span className="notification-dot" aria-hidden="true" />
                  <span className="notification-copy">
                    <strong>{notification.title}</strong>
                    <span>{notification.message}</span>
                    <small>{formatTimestamp(locale, notification.createdAt)}</small>
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
