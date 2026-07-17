import { NavLink } from '@/packages/router';
import type { MessageKey } from '@/shared/i18n';

import { HOME_PATH } from '../../../router/app-route-paths.constants';
import { NAV_ITEMS } from '../../app-layout.constants';

interface SidebarNavProps {
  t: (key: MessageKey) => string;
}

/** Primary navigation links inside the desktop sidebar. */
export function SidebarNav({ t }: SidebarNavProps) {
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
    </nav>
  );
}
