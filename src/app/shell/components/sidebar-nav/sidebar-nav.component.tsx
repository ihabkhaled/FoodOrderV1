import type { Locale } from '@/modules/data-access';
import { NavLink } from '@/packages/router';
import type { MessageKey } from '@/shared/i18n';

import { HOME_PATH } from '../../../router/app-route-paths.constants';
import { NAV_ITEMS } from '../../app-layout.constants';
import { buildPublicNavLinks } from '../../helpers/public-nav-links.helper';

interface SidebarNavProps {
  t: (key: MessageKey) => string;
  locale: Locale;
}

/** Primary navigation links inside the desktop sidebar. */
export function SidebarNav({ t, locale }: SidebarNavProps) {
  const publicLinks = buildPublicNavLinks(locale);
  const leading = publicLinks.filter((link) => link.placement === 'leading');
  const trailing = publicLinks.filter((link) => link.placement === 'trailing');
  return (
    <nav className="sidebar-nav" aria-label={t('primaryNavigation')}>
      {leading.map(({ id, href, label, icon: Icon }) => (
        <a className="nav-link" key={id} href={href} title={label}>
          <Icon />
          <span className="label-collapsible">{label}</span>
        </a>
      ))}
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
      {trailing.map(({ id, href, label, icon: Icon }) => (
        <a className="nav-link" key={id} href={href} title={label}>
          <Icon />
          <span className="label-collapsible">{label}</span>
        </a>
      ))}
    </nav>
  );
}
