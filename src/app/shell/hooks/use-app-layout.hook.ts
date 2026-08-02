import { useEffect, useRef, useState } from 'react';

import type { AppNotification, Locale, Theme } from '@/modules/data-access';
import { notificationService } from '@/modules/data-access';
import type { ToastState } from '@/modules/session';
import { useApp } from '@/modules/session';
import { useLocation, useNavigate } from '@/packages/router';
import { isDocumentHidden, scrollViewportToTop } from '@/platform/browser';
import {
  loadNotificationPromptSeen,
  loadSidebarCollapsed,
  markAppOpenedAndWasReturning,
  queryNotificationPermission,
  registerForPushNotifications,
  requestNotificationPermission,
  runtimePlatformName,
  saveNotificationPromptSeen,
  saveSidebarCollapsed,
  showTrayNotification,
  subscribeToPushNotificationTaps,
  subscribeToTrayNotificationTaps,
  unregisterFromPushNotifications,
} from '@/platform/device';
import type { MessageKey } from '@/shared/i18n';

import { HOME_PATH } from '../../router/app-route-paths.constants';
import { selectNewUnreadNotifications } from '../helpers/notification-mirror.helper';

interface RouteRefreshState {
  readonly notificationOpenSequence?: unknown;
}

export interface AppLayoutViewModel {
  t: (key: MessageKey) => string;
  userDisplayName: string | undefined;
  confirmingLogout: boolean;
  loggingOut: boolean;
  requestLogout: () => void;
  cancelLogout: () => void;
  confirmLogout: () => Promise<void>;
  online: boolean;
  toast: ToastState | null;
  locale: Locale;
  theme: Theme;
  setDeviceLocale: (locale: Locale) => Promise<void>;
  setDeviceTheme: (theme: Theme) => Promise<void>;
  contentKey: string;
  collapsed: boolean;
  toggleCollapsed: () => void;
  notifications: AppNotification[];
  notificationsLoading: boolean;
  notificationPromptOpen: boolean;
  enableNotifications: () => Promise<void>;
  dismissNotificationPrompt: () => void;
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
    toast,
    locale,
    theme,
    setDeviceLocale,
    setDeviceTheme,
  } = useApp();
  const location = useLocation();
  const routeState = location.state as RouteRefreshState | null;
  const notificationOpenSequence =
    typeof routeState?.notificationOpenSequence === 'number'
      ? routeState.notificationOpenSequence
      : null;
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const navigate = useNavigate();
  /** Null until the first subscription payload establishes the baseline. */
  const mirroredRef = useRef<AppNotification[] | null>(null);
  const trayOpenSequence = useRef(0);
  /** Token this device registered, so sign-out can stop delivery to it. */
  const pushTokenRef = useRef<string | null>(null);
  const [notificationPromptOpen, setNotificationPromptOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    scrollViewportToTop();
  }, [location.pathname, notificationOpenSequence]);

  useEffect(() => {
    void loadSidebarCollapsed()
      .then(setCollapsed)
      .catch(() => {
        setCollapsed(false);
      });
  }, []);

  /**
   * Mirrors newly arrived unread notifications into the OS tray. Suppressed
   * while the app is in front — the in-app centre already shows them there.
   */
  const mirrorToTray = async (
    incoming: AppNotification[],
  ): Promise<void> => {
    const fresh = selectNewUnreadNotifications(mirroredRef.current, incoming);
    mirroredRef.current = incoming;
    if (fresh.length === 0 || !isDocumentHidden()) return;
    if ((await queryNotificationPermission()) !== 'granted') return;
    for (const notification of fresh) {
      await showTrayNotification({
        id: notification.id,
        title: notification.title,
        body: notification.message,
        route: notification.route,
      });
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setNotificationsLoading(false);
      mirroredRef.current = null;
      return;
    }
    setNotificationsLoading(true);
    mirroredRef.current = null;
    return notificationService.subscribe(
      user.id,
      (incoming) => {
        void mirrorToTray(incoming);
        setNotifications(incoming);
        setNotificationsLoading(false);
      },
      () => {
        setNotifications([]);
        setNotificationsLoading(false);
      },
    );
  }, [user]);

  // Register this device for push so a closed app still receives rounds and
  // invitations. Registration is idempotent and silently no-ops on the web.
  useEffect(() => {
    if (!user) return;
    let active = true;
    void registerForPushNotifications()
      .then(async (token) => {
        if (!active || !token) return;
        pushTokenRef.current = token;
        await notificationService.savePushToken(
          user.id,
          token,
          runtimePlatformName(),
        );
      })
      .catch(() => {
        // A device without push configured simply keeps in-app notifications.
      });
    return () => {
      active = false;
    };
  }, [user]);

  // Tapping an OS notification opens its in-app destination. The monotonic
  // sequence forces a refresh even when the route is already displayed.
  useEffect(
    () =>
      subscribeToTrayNotificationTaps((route) => {
        trayOpenSequence.current += 1;
        void navigate(route, {
          state: { notificationOpenSequence: trayOpenSequence.current },
        });
      }),
    [navigate],
  );

  useEffect(
    () =>
      subscribeToPushNotificationTaps((route) => {
        trayOpenSequence.current += 1;
        void navigate(route, {
          state: { notificationOpenSequence: trayOpenSequence.current },
        });
      }),
    [navigate],
  );

  // Offer notifications once per device, and only when the OS can still be
  // asked. The ask waits for a later visit so it never lands on top of the
  // first-run tour, and only on the dashboard so it never interrupts a form.
  // Declining is remembered; Settings keeps the control available.
  useEffect(() => {
    if (!user || location.pathname !== HOME_PATH) return;
    let active = true;
    void Promise.all([
      queryNotificationPermission(),
      loadNotificationPromptSeen(),
      markAppOpenedAndWasReturning(),
    ])
      .then(([permission, seen, returning]) => {
        if (active && returning && permission === 'prompt' && !seen) {
          setNotificationPromptOpen(true);
        }
      })
      .catch(() => {
        // Never block the shell on a permission query.
      });
    return () => {
      active = false;
    };
  }, [user, location.pathname]);

  const enableNotifications = async (): Promise<void> => {
    setNotificationPromptOpen(false);
    await saveNotificationPromptSeen();
    await requestNotificationPermission();
  };

  const dismissNotificationPrompt = (): void => {
    setNotificationPromptOpen(false);
    void saveNotificationPromptSeen();
  };

  const requestLogout = (): void => {
    setConfirmingLogout(true);
  };

  const cancelLogout = (): void => {
    if (loggingOut) return;
    setConfirmingLogout(false);
  };

  const confirmLogout = async (): Promise<void> => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      // Stop push to this device before the session ends, otherwise it would
      // keep receiving another account's notifications on a shared phone.
      const token = pushTokenRef.current;
      if (token && user) {
        await notificationService.removePushToken(user.id, token).catch(() => {});
        await unregisterFromPushNotifications();
        pushTokenRef.current = null;
      }
      await logout();
    } finally {
      setLoggingOut(false);
      setConfirmingLogout(false);
    }
  };

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
    confirmingLogout,
    loggingOut,
    requestLogout,
    cancelLogout,
    confirmLogout,
    online,
    toast,
    locale,
    theme,
    setDeviceLocale,
    setDeviceTheme,
    contentKey: `${location.pathname}:${notificationOpenSequence ?? ''}`,
    collapsed,
    toggleCollapsed,
    notifications,
    notificationsLoading,
    notificationPromptOpen,
    enableNotifications,
    dismissNotificationPrompt,
    markNotificationsRead,
  };
}
