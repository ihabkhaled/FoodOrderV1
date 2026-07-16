import { useApp } from '@/modules/session';
import { Languages } from '@/packages/icons';
import { Outlet } from '@/packages/router';

export function AuthLayout() {
  const { t, storageMode, locale, setDeviceLocale } = useApp();
  const nextLocale = locale === 'ar' ? 'en' : 'ar';
  return <main className="auth-shell">
    <button
      type="button"
      className="button secondary locale-toggle"
      onClick={() => void setDeviceLocale(nextLocale)}
      aria-label={t('language')}
    >
      <Languages />{nextLocale === 'ar' ? 'العربية' : 'English'}
    </button>
    <section className="auth-hero"><div className="brand-mark large">FO</div><h1>{t('appName')}</h1><p>{t('quickStart')}</p></section>
    <section className="auth-card"><Outlet />{storageMode === 'firebase' ? null : <p className="notice">{t('localModeNotice')}</p>}</section>
  </main>;
}
