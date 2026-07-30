import type { Locale } from '@/modules/data-access';
import {
  buildPublicContentPath,
  getPublicPageCopy,
  toPublicLocale,
} from '@/modules/public-content';
import { Home, Mail } from '@/packages/icons';
import { NavLink } from '@/packages/router';
import type { MessageKey } from '@/shared/i18n';

import { HOME_PATH } from '../../../router/app-route-paths.constants';
import { NAV_ITEMS } from '../../app-layout.constants';

interface SidebarNavProps {
  t: (key: MessageKey) => string;
  locale: Locale;
}

/** Primary navigation links inside the desktop sidebar. */
export function SidebarNav({ t, locale }: SidebarNavProps) {
  const contactPath = buildPublicContentPath('contact', toPublicLocale(locale));
  const contactLabel = getPublicPageCopy('contact', toPublicLocale(locale)).navigationLabel;
  const welcomePath = buildPublicContentPath('home', toPublicLocale(locale));
  const welcomeLabel = getPublicPageCopy('home', toPublicLocale(locale)).navigationLabel;
  return (
    <nav className="sidebar-nav" aria-label={t('primaryNavigation')}>
      {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
        <NavLink
          key={to}
          to={to}
          end={to === HOME_PATH}
          title={t(key)}
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
        >
          <Icon />
          <span className="label-collapsible">{t(key)}</span>
        </NavLink>
      ))}
      <a className="nav-link" href={welcomePath} title={welcomeLabel}>
        <Home />
        <span className="label-collapsible">{welcomeLabel}</span>
      </a>
      <a className="nav-link" href={contactPath} title={contactLabel}>
        <Mail />
        <span className="label-collapsible">{contactLabel}</span>
      </a>
    </nav>
  );
}
