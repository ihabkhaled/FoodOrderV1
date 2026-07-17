import { useApp } from '@/modules/session';
import { Languages } from '@/packages/icons';
import { Outlet } from '@/packages/router';
import { nextTheme } from '@/platform/device';

import { THEME_ICON, THEME_LABEL } from './app-layout.constants';

/** Signed-out shell: compact preferences, hero branding, and the auth card. */
export function AuthLayoutContainer() {
  const {
    t,
    storageMode,
    locale,
    theme,
    setDeviceLocale,
    setDeviceTheme,
  } = useApp();
  const nextLocale = locale === 'ar' ? 'en' : 'ar';
  const languageLabel =
    nextLocale === 'ar' ? t('switchToArabic') : t('switchToEnglish');
  const ThemeIcon = THEME_ICON[theme];

  return (
    <main className="auth-shell">
      <div className="auth-controls">
        <button
          type="button"
          className="icon-button auth-control-button"
          onClick={() => void setDeviceLocale(nextLocale)}
          title={languageLabel}
          aria-label={languageLabel}
        >
          <Languages />
        </button>
        <button
          type="button"
          className="icon-button auth-control-button"
          onClick={() => void setDeviceTheme(nextTheme(theme))}
          title={t(THEME_LABEL[theme])}
          aria-label={t(THEME_LABEL[theme])}
        >
          <ThemeIcon />
        </button>
      </div>

      <section className="auth-hero">
        <div className="brand-mark large">FO</div>
        <h1>{t('appName')}</h1>
        <p>{t('quickStart')}</p>
      </section>
      <section className="auth-card">
        <Outlet />
        {storageMode === 'firebase' ? null : (
          <p className="notice">{t('localModeNotice')}</p>
        )}
      </section>
    </main>
  );
}
