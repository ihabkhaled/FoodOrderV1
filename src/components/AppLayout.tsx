import { Home, ListOrdered, LogOut, Settings, ShoppingBasket, Wifi, WifiOff } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '@/state/AppContext';

const items = [
  { to: '/', icon: Home, key: 'dashboard' as const },
  { to: '/buckets', icon: ShoppingBasket, key: 'buckets' as const },
  { to: '/orders', icon: ListOrdered, key: 'orders' as const },
  { to: '/settings', icon: Settings, key: 'settings' as const },
];

export function AppLayout() {
  const { t, user, logout, online, storageMode, toast } = useApp();
  const location = useLocation();
  return <div className="app-shell">
    <header className="topbar">
      <NavLink to="/" className="brand"><span className="brand-mark">FO</span><span>{t('appName')}</span></NavLink>
      <div className="topbar-meta">
        <span className={`connection ${online ? 'online' : 'offline'}`}>{online ? <Wifi size={15} /> : <WifiOff size={15} />}{online ? t('online') : t('offline')}</span>
        <span className="mode-pill">{storageMode === 'firebase' ? t('firebaseMode') : t('localMode')}</span>
        <span className="user-name">{user?.displayName}</span>
        <button className="icon-button" onClick={() => void logout()} title={t('logout')} aria-label={t('logout')}><LogOut /></button>
      </div>
    </header>
    <main className="main-content" key={location.pathname}><Outlet /></main>
    <nav className="bottom-nav" aria-label="Primary navigation">
      {items.map(({ to, icon: Icon, key }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'active' : ''}><Icon /><span>{t(key)}</span></NavLink>)}
    </nav>
    {toast ? <div className={`toast toast-${toast.kind}`} role="status">{toast.message}</div> : null}
  </div>;
}
