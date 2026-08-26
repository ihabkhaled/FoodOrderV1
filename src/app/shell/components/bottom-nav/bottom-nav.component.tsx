import type { Locale } from '@/modules/data-access';
import { NavLink } from '@/packages/router';
import type { MessageKey } from '@/shared/i18n';

import { HOME_PATH } from '../../../router/app-route-paths.constants';
import { NAV_ITEMS } from '../../app-layout.constants';
import { buildPublicNavLinks } from '../../helpers/public-nav-links.helper';

interface BottomNavProps {
  t: (key: MessageKey) => string;
  locale: Locale;
}

/**
 * Primary navigation shown at the bottom on mobile viewports.
 *
 * It carries the marketing destinations the sidebar has always had — the
 * bottom bar omitted them, so a phone had no route back to the public site.
 * With those added the row no longer fits on a narrow screen, so it scrolls
 * horizontally with momentum rather than shrinking every target below the
 * minimum touch size.
 */
export function BottomNav({ t, locale }: BottomNavProps) {
  const publicLinks = buildPublicNavLinks(locale);
  const leading = publicLinks.filter((link) => link.placement === 'leading');
  const trailing = publicLinks.filter((link) => link.placement === 'trailing');

  return (
    <nav className="bottom-nav" aria-label={t('primaryNavigation')}>
      {leading.map(({ id, href, label, icon: Icon }) => (
        <a className="bottom-nav-link" key={id} href={href}>
          <Icon />
          <span>{label}</span>
        </a>
      ))}
      {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
        <NavLink
          key={to}
          to={to}
          end={to === HOME_PATH}
          className={({ isActive }) => (isActive ? 'bottom-nav-link active' : 'bottom-nav-link')}
        >
          <Icon />
          <span>{t(key)}</span>
        </NavLink>
      ))}
      {trailing.map(({ id, href, label, icon: Icon }) => (
        <a className="bottom-nav-link" key={id} href={href}>
          <Icon />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
