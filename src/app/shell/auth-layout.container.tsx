import {
  buildPublicContentPath,
  getPublicPageCopy,
  toPublicLocale,
} from '@/modules/public-content';
import { useApp } from '@/modules/session';
import { Home } from '@/packages/icons';
import { Outlet } from '@/packages/router';
import { nextTheme } from '@/platform/device';
import { LanguageSelect } from '@/shared/ui';

import { THEME_ICON, THEME_LABEL } from './app-layout.constants';

/** Signed-out shell: compact preferences, hero branding, and the auth card. */
export function AuthLayoutContainer() {
  const { t, locale, theme, setDeviceLocale, setDeviceTheme } = useApp();
  const ThemeIcon = THEME_ICON[theme];
  const welcomePath = buildPublicContentPath('home', toPublicLocale(locale));
  const welcomeLabel = getPublicPageCopy('home', toPublicLocale(locale)).navigationLabel;

  return (
    <main className="auth-shell">
      <div className="auth-controls">
        <a
          className="icon-button auth-control-button"
          href={welcomePath}
          title={welcomeLabel}
          aria-label={welcomeLabel}
        >
          <Home />
        </a>
        <LanguageSelect
          locale={locale}
          label={t('language')}
          className="auth-language-select"
          onChange={(nextLocale) => void setDeviceLocale(nextLocale)}
        />
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
      </section>
    </main>
  );
}
