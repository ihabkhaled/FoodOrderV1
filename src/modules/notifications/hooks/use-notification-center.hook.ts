import { type RefObject, useEffect, useRef, useState } from 'react';

import type { AppNotification, Locale } from '@/modules/data-access';
import type { SocialMessageKey } from '@/modules/social';
import { translateSocial } from '@/modules/social';
import { useNavigate } from '@/packages/router';
import { subscribeToPointerDown } from '@/platform/browser';

interface NotificationCenterInput {
  notifications: AppNotification[];
  locale: Locale;
  onMarkRead: (notificationIds: string[]) => Promise<void>;
}

export interface NotificationCenterViewModel {
  open: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
  unreadCount: number;
  s: (key: SocialMessageKey) => string;
  toggle: () => void;
  markAllRead: () => void;
  openNotification: (notification: AppNotification) => void;
}

export function useNotificationCenter({
  notifications,
  locale,
  onMarkRead,
}: NotificationCenterInput): NotificationCenterViewModel {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const s = (key: SocialMessageKey) => translateSocial(locale, key);
  const unread = notifications.filter((notification) => !notification.readAt);

  useEffect(
    () =>
      subscribeToPointerDown((target) => {
        if (root.current && !root.current.contains(target as Node)) {
          setOpen(false);
        }
      }),
    [],
  );

  const toggle = (): void => {
    setOpen((current) => !current);
  };

  const markAllRead = (): void => {
    void onMarkRead(unread.map((item) => item.id));
  };

  const openNotification = (notification: AppNotification): void => {
    if (!notification.readAt) void onMarkRead([notification.id]);
    setOpen(false);
    void navigate(notification.route);
  };

  return {
    open,
    rootRef: root,
    unreadCount: unread.length,
    s,
    toggle,
    markAllRead,
    openNotification,
  };
}
