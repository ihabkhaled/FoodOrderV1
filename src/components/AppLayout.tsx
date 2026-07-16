import { useEffect, useState } from 'react';

import { NotificationCenter } from '@/components/NotificationCenter';
import { RefreshableViewport } from '@/components/RefreshableViewport';
import type { MessageKey } from '@/i18n/messages';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Languages,
  ListOrdered,
  LogOut,
  Monitor,
  Moon,
  Settings,
  ShoppingBasket,
  Sun,
  Users,
  Wifi,
  WifiOff,
} from '@/packages/icons';
import { NavLink, Outlet, useLocation } from '@/packages/router';
import {
  loadSidebarCollapsed,
  nextTheme,
  saveSidebarCollapsed,
} from '@/platform/device';
import { notificationService } from '@/services';
import { useApp } from '@/state/AppContext';
import type { Theme } from '@/types/domain';
import type { AppNotification } from '@/types/notifications';

const NAV_ITEMS: { to: string; icon: typeof Home; key: MessageKey }[] = [
  { to: '/', icon: Home, key: 'dashboard' },
  { to: '/buckets', icon: ShoppingBasket, key: 'buckets' },
  { to: '/social', icon: Users, key: 'members' },
  { to: '/orders', icon: ListOrdered, key: 'orders' },
  { to: '/settings', icon: Settings, key: 'settings' },
];

const THEME_ICON: Record<Theme, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};
const THEME_LABEL: Record<Theme, MessageKey> = {
  system: 'themeSystem',
  light: 'themeLight',
  dark: 'themeDark',
};

export function AppLayout() {
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
    return notificationService.subscribe(
      user.id,
      setNotifications,
      () => {
        setNotifications([]);
      },
    );
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

  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const ThemeIcon = THEME_ICON[theme];
  const connection = (
    <span className={`connection ${online ? 'online' : 'offline'}`}>
      {online ? <Wifi size={15} /> : <WifiOff size={15} />}
      <span className="label-collapsible">
        {online ? t('online') : t('offline')}
      </span>
    </span>
  );
  const localeButton = (
    <button
      className="icon-button"
      onClick={() => void setDeviceLocale(otherLocale)}
      title={
        otherLocale === 'ar' ? t('switchToArabic') : t('switchToEnglish')
      }
      aria-label={
        otherLocale === 'ar' ? t('switchToArabic') : t('switchToEnglish')
      }
    >
      <Languages />
    </button>
  );
  const themeButton = (
    <button
      className="icon-button"
      onClick={() => void setDeviceTheme(nextTheme(theme))}
      title={t(THEME_LABEL[theme])}
      aria-label={t(THEME_LABEL[theme])}
    >
      <ThemeIcon />
    </button>
  );
  const logoutButton = (
    <button
      className="icon-button"
      onClick={() => void logout()}
      title={t('logout')}
      aria-label={t('logout')}
    >
      <LogOut />
    </button>
  );

  return (
    <div className={`app-shell${collapsed ? ' collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-head">
          <NavLink to="/" className="brand">
            <span className="brand-mark">FO</span>
            <span className="label-collapsible">{t('appName')}</span>
          </NavLink>
          <button
            className="icon-button collapse-toggle"
            onClick={toggleCollapsed}
            title={collapsed ? t('expandSidebar') : t('collapseSidebar')}
            aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
        </div>
        <nav className="sidebar-nav" aria-label={t('primaryNavigation')}>
          {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={t(key)}
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              <Icon />
              <span className="label-collapsible">{t(key)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-controls">
            <NotificationCenter
              notifications={notifications}
              locale={locale}
              placement="sidebar"
              onMarkRead={markNotificationsRead}
            />
            {localeButton}
            {themeButton}
          </div>
          {connection}
          <span className="mode-pill">
            <span className="label-collapsible">
              {storageMode === 'firebase' ? t('firebaseMode') : t('localMode')}
            </span>
          </span>
          <div className="sidebar-user">
            <span className="user-name label-collapsible">
              {user?.displayName}
            </span>
            {logoutButton}
          </div>
        </div>
      </aside>

      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">FO</span>
          <span>{t('appName')}</span>
        </NavLink>
        <div className="topbar-meta">
          <NotificationCenter
            notifications={notifications}
            locale={locale}
            placement="topbar"
            onMarkRead={markNotificationsRead}
          />
          {localeButton}
          {themeButton}
          {connection}
          {logoutButton}
        </div>
      </header>

      <main className="main-content">
        <RefreshableViewport key={location.pathname}>
          <Outlet />
        </RefreshableViewport>
      </main>

      <nav className="bottom-nav" aria-label={t('primaryNavigation')}>
        {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <Icon />
            <span>{t(key)}</span>
          </NavLink>
        ))}
      </nav>

      {toast ? (
        <div className={`toast toast-${toast.kind}`} role="status">
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
