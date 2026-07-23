import type {
  PublicHeaderProps,
  PublicNavigationItem,
} from '../types/public-content.types';

const navigationLinks = (items: PublicNavigationItem[]) =>
  items.map((item) => (
    <a
      key={item.href}
      href={item.href}
      aria-current={item.current ? 'page' : undefined}
    >
      {item.label}
    </a>
  ));

export function PublicHeader({
  brandName,
  homePath,
  applicationPath,
  currentLocaleLabel,
  navigationItems,
  localeLinks,
  ui,
}: PublicHeaderProps) {
  return (
    <>
      <a className="public-skip-link" href="#public-main">
        {ui.skipToContentLabel}
      </a>
      <header className="public-header">
        <div className="public-header__inner">
          <a className="public-brand" href={homePath}>
            <span className="public-brand__mark" aria-hidden="true">
              FO
            </span>
            <span>{brandName}</span>
          </a>
          <nav
            className="public-navigation public-navigation--desktop"
            aria-label={ui.primaryNavigationLabel}
          >
            {navigationLinks(navigationItems)}
          </nav>
          <div className="public-header__actions">
            <details className="public-language-menu">
              <summary>
                <span className="public-language-menu__prefix">
                  {ui.languageLabel}:{' '}
                </span>
                <span>{currentLocaleLabel}</span>
              </summary>
              <ul>
                {localeLinks.map((locale) => (
                  <li key={locale.code}>
                    <a
                      href={locale.href}
                      hrefLang={locale.code}
                      aria-current={locale.current ? 'page' : undefined}
                    >
                      {locale.label}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
            <a className="public-button public-button--small" href={applicationPath}>
              {ui.openApplicationLabel}
            </a>
            <details className="public-mobile-menu">
              <summary>
                <span className="public-mobile-menu__icon" aria-hidden="true">
                  ☰
                </span>
                <span className="public-mobile-menu__label">
                  {ui.mobileNavigationLabel}
                </span>
              </summary>
              <nav aria-label={ui.primaryNavigationLabel}>
                {navigationLinks(navigationItems)}
              </nav>
            </details>
          </div>
        </div>
      </header>
    </>
  );
}
