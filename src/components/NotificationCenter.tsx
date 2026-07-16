import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { translateSocial } from '@/i18n/socialMessages';
import type { Locale } from '@/types/domain';
import type { AppNotification } from '@/types/notifications';

interface NotificationCenterProps {
  notifications: AppNotification[];
  locale: Locale;
  placement: 'topbar' | 'sidebar';
  onMarkRead: (notificationIds: string[]) => Promise<void>;
}

const formatTimestamp = (locale: Locale, timestamp: string): string =>
  new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));

export function NotificationCenter({
  notifications,
  locale,
  placement,
  onMarkRead,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const s = (key: Parameters<typeof translateSocial>[1]) =>
    translateSocial(locale, key);
  const unread = notifications.filter((notification) => !notification.readAt);

  useEffect(() => {
    const closeOutside = (event: PointerEvent): void => {
      if (root.current && !root.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, []);

  const openNotification = (notification: AppNotification): void => {
    if (!notification.readAt) void onMarkRead([notification.id]);
    setOpen(false);
    void navigate(notification.route);
  };

  return (
    <div
      className={`notification-center notification-${placement}`}
      ref={root}
    >
      <button
        className="icon-button notification-trigger"
        type="button"
        title={s('notifications')}
        aria-label={s('notifications')}
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        <Bell />
        {unread.length > 0 ? (
          <span className="notification-badge">
            {unread.length > 99 ? '99+' : unread.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <section className="notification-panel" aria-label={s('notifications')}>
          <header className="notification-panel-head">
            <div>
              <strong>{s('notifications')}</strong>
              <span className="muted">
                {unread.length} {s('unreadNotifications')}
              </span>
            </div>
            <button
              className="button secondary notification-read-all"
              type="button"
              disabled={unread.length === 0}
              onClick={() => void onMarkRead(unread.map((item) => item.id))}
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
                    openNotification(notification);
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
