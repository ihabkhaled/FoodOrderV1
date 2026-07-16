import { NotificationCenter } from '@/modules/notifications';
import {
  ChevronLeft,
  ChevronRight,
  Languages,
  LogOut,
  Wifi,
  WifiOff,
} from '@/packages/icons';
import { NavLink, Outlet } from '@/packages/router';
import { nextTheme } from '@/platform/device';
import { RefreshableViewport } from '@/shared/ui';

import { HOME_PATH } from '../router/app-route-paths.constants';
import { THEME_ICON, THEME_LABEL } from './app-layout.constants';
import { BottomNav } from './components/bottom-nav/bottom-nav.component';
import { SidebarNav } from './components/sidebar-nav/sidebar-nav.component';
import { ToastViewport } from './components/toast-viewport/toast-viewport.component';
import { useAppLayout } from './hooks/use-app-layout.hook';

/** Authenticated shell: sidebar, topbar, routed content, bottom nav, toast. */
export function AppLayoutContainer() {
  const {
    t,
    userDisplayName,
    logout,
    online,
    storageMode,
    toast,
    locale,
    theme,
    setDeviceLocale,
    setDeviceTheme,
    pathname,
    collapsed,
    toggleCollapsed,
    notifications,
    markNotificationsRead,
  } = useAppLayout();

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
      title={otherLocale === 'ar' ? t('switchToArabic') : t('switchToEnglish')}
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
          <NavLink to={HOME_PATH} className="brand">
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
        <SidebarNav t={t} />
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
              {userDisplayName}
            </span>
            {logoutButton}
          </div>
        </div>
      </aside>

      <header className="topbar">
        <NavLink to={HOME_PATH} className="brand">
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
        <RefreshableViewport key={pathname} locale={locale}>
          <Outlet />
        </RefreshableViewport>
      </main>

      <BottomNav t={t} />

      <ToastViewport toast={toast} />
    </div>
  );
}
