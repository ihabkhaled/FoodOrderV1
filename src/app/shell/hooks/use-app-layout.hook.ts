import { useEffect, useState } from 'react';

import type { AppNotification, Locale, Theme } from '@/modules/data-access';
import { notificationService } from '@/modules/data-access';
import type { ToastState } from '@/modules/session';
import { useApp } from '@/modules/session';
import { useLocation } from '@/packages/router';
import { loadSidebarCollapsed, saveSidebarCollapsed } from '@/platform/device';
import type { MessageKey } from '@/shared/i18n';

export interface AppLayoutViewModel {
  t: (key: MessageKey) => string;
  userDisplayName: string | undefined;
  logout: () => Promise<void>;
  online: boolean;
  storageMode: string;
  toast: ToastState | null;
  locale: Locale;
  theme: Theme;
  setDeviceLocale: (locale: Locale) => Promise<void>;
  setDeviceTheme: (theme: Theme) => Promise<void>;
  pathname: string;
  collapsed: boolean;
  toggleCollapsed: () => void;
  notifications: AppNotification[];
  markNotificationsRead: (notificationIds: string[]) => Promise<void>;
}

/**
 * Shell state for the authenticated app layout: sidebar collapse persistence,
 * the notification subscription, and the session values the shell renders.
 */
export function useAppLayout(): AppLayoutViewModel {
  const {
    t,
    user,
    logout,
    online,
    storageMode,
    toast,
    locale,
    theme,
    setDeviceLocale,
    setDeviceTheme,
  } = useApp();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    void loadSidebarCollapsed()
      .then(setCollapsed)
      .catch(() => {
        setCollapsed(false);
      });
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    return notificationService.subscribe(user.id, setNotifications, () => {
      setNotifications([]);
    });
  }, [user]);

  const toggleCollapsed = (): void => {
    setCollapsed((current) => {
      const next = !current;
      void saveSidebarCollapsed(next);
      return next;
    });
  };

  const markNotificationsRead = async (
    notificationIds: string[],
  ): Promise<void> => {
    if (!user || notificationIds.length === 0) return;
    const selected = new Set(notificationIds);
    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) =>
        selected.has(notification.id) && !notification.readAt
          ? { ...notification, readAt }
          : notification,
      ),
    );
    await notificationService.markRead(user.id, notificationIds);
  };

  return {
    t,
    userDisplayName: user?.displayName,
    logout,
    online,
    storageMode,
    toast,
    locale,
    theme,
    setDeviceLocale,
    setDeviceTheme,
    pathname: location.pathname,
    collapsed,
    toggleCollapsed,
    notifications,
    markNotificationsRead,
  };
}
