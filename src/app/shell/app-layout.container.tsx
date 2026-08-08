import { NotificationCenter } from '@/modules/notifications';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Wifi,
  WifiOff,
} from '@/packages/icons';
import { NavLink, Outlet } from '@/packages/router';
import { nextTheme } from '@/platform/device';
import {
  ConfirmDialog,
  LanguageSelect,
  Loading,
  RefreshableViewport,
} from '@/shared/ui';

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
    confirmingLogout,
    loggingOut,
    requestLogout,
    cancelLogout,
    confirmLogout,
    online,
    toast,
    locale,
    localeNavigationPending,
    theme,
    setDeviceLocale,
    setDeviceTheme,
    contentKey,
    collapsed,
    toggleCollapsed,
    notifications,
    notificationsLoading,
    notificationPromptOpen,
    enableNotifications,
    dismissNotificationPrompt,
    markNotificationsRead,
  } = useAppLayout();

  if (localeNavigationPending) return <Loading label={t('loading')} />;

  const ThemeIcon = THEME_ICON[theme];
  const connection = (
    <span className={`connection ${online ? 'online' : 'offline'}`}>
      {online ? <Wifi size={15} /> : <WifiOff size={15} />}
      <span className="label-collapsible">
        {online ? t('online') : t('offline')}
      </span>
    </span>
  );
  const localeSelect = (compact: boolean) => (
    <LanguageSelect
      locale={locale}
      label={t('language')}
      className="shell-language-select"
      compact={compact}
      onChange={(nextLocale) => void setDeviceLocale(nextLocale)}
    />
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
      onClick={requestLogout}
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
        <SidebarNav t={t} locale={locale} />
        <div className="sidebar-footer">
          <div className="sidebar-controls">
            <NotificationCenter
              notifications={notifications}
              loading={notificationsLoading}
              locale={locale}
              placement="sidebar"
              onMarkRead={markNotificationsRead}
            />
            {localeSelect(collapsed)}
            {themeButton}
          </div>
          {connection}
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
            loading={notificationsLoading}
            locale={locale}
            placement="topbar"
            onMarkRead={markNotificationsRead}
          />
          {localeSelect(true)}
          {themeButton}
          {connection}
          {logoutButton}
        </div>
      </header>

      <main className="main-content">
        <RefreshableViewport key={contentKey} locale={locale}>
          <Outlet />
        </RefreshableViewport>
      </main>

      <BottomNav t={t} />

      <ToastViewport toast={toast} />

      <ConfirmDialog
        open={confirmingLogout}
        title={t('confirmLogoutTitle')}
        message={t('confirmLogoutMessage')}
        confirmLabel={loggingOut ? t('loggingOut') : t('logout')}
        cancelLabel={t('cancel')}
        busy={loggingOut}
        onConfirm={() => void confirmLogout()}
        onCancel={cancelLogout}
      />

      <ConfirmDialog
        open={notificationPromptOpen}
        title={t('notificationPromptTitle')}
        message={t('notificationPromptMessage')}
        confirmLabel={t('notificationPromptEnable')}
        cancelLabel={t('notificationPromptLater')}
        onConfirm={() => void enableNotifications()}
        onCancel={dismissNotificationPrompt}
      />
    </div>
  );
}
