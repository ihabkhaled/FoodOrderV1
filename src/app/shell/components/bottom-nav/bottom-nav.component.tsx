import { NavLink } from '@/packages/router';
import type { MessageKey } from '@/shared/i18n';

import { HOME_PATH } from '../../../router/app-route-paths.constants';
import { NAV_ITEMS } from '../../app-layout.constants';

interface BottomNavProps {
  t: (key: MessageKey) => string;
}

/** Primary navigation bar shown at the bottom on mobile viewports. */
export function BottomNav({ t }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label={t('primaryNavigation')}>
      {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
        <NavLink
          key={to}
          to={to}
          end={to === HOME_PATH}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          <Icon />
          <span>{t(key)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
