import { Outlet } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
export function AuthLayout() {
  const { t, storageMode } = useApp();
  return <main className="auth-shell"><section className="auth-hero"><div className="brand-mark large">FO</div><h1>{t('appName')}</h1><p>{t('quickStart')}</p></section><section className="auth-card"><Outlet />{storageMode !== 'firebase' ? <p className="notice">{t('localModeNotice')}</p> : null}</section></main>;
}
