import { Home, ListOrdered, LogOut, Settings, ShoppingBasket, Wifi, WifiOff } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import type { MessageKey } from '@/i18n/messages';

const NAV_ITEMS: { to: string; icon: typeof Home; key: MessageKey }[] = [
  { to: '/', icon: Home, key: 'dashboard' },
  { to: '/buckets', icon: ShoppingBasket, key: 'buckets' },
  { to: '/orders', icon: ListOrdered, key: 'orders' },
  { to: '/settings', icon: Settings, key: 'settings' },
];

export function AppLayout() {
  const { t, user, logout, online, storageMode, toast } = useApp();
  const location = useLocation();
  const connection = (
    <span className={`connection ${online ? 'online' : 'offline'}`}>
      {online ? <Wifi size={15} /> : <WifiOff size={15} />}
      {online ? t('online') : t('offline')}
    </span>
  );

  return (
    <div className="app-shell">
      {/* Desktop / tablet: persistent sidebar */}
      <aside className="sidebar">
        <NavLink to="/" className="brand"><span className="brand-mark">FO</span><span>{t('appName')}</span></NavLink>
        <nav className="sidebar-nav" aria-label={t('primaryNavigation')}>
          {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              <Icon /><span>{t(key)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          {connection}
          <span className="mode-pill">{storageMode === 'firebase' ? t('firebaseMode') : t('localMode')}</span>
          <div className="sidebar-user">
            <span className="user-name">{user?.displayName}</span>
            <button className="icon-button" onClick={() => void logout()} title={t('logout')} aria-label={t('logout')}><LogOut /></button>
          </div>
        </div>
      </aside>

      {/* Mobile: slim top bar */}
      <header className="topbar">
        <NavLink to="/" className="brand"><span className="brand-mark">FO</span><span>{t('appName')}</span></NavLink>
        <div className="topbar-meta">
          {connection}
          <button className="icon-button" onClick={() => void logout()} title={t('logout')} aria-label={t('logout')}><LogOut /></button>
        </div>
      </header>

      <main className="main-content" key={location.pathname}><Outlet /></main>

      {/* Mobile: bottom navigation */}
      <nav className="bottom-nav" aria-label={t('primaryNavigation')}>
        {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon /><span>{t(key)}</span>
          </NavLink>
        ))}
      </nav>

      {toast ? <div className={`toast toast-${toast.kind}`} role="status">{toast.message}</div> : null}
    </div>
  );
}
