import type { Locale } from '@/modules/data-access';
import { NavLink } from '@/packages/router';
import type { MessageKey } from '@/shared/i18n';

import { HOME_PATH } from '../../../router/app-route-paths.constants';
import { NAV_ITEMS } from '../../app-layout.constants';

interface BottomNavProps {
  t: (key: MessageKey) => string;
  locale: Locale;
}

/**
 * Primary navigation shown at the bottom on mobile viewports.
 *
 * Exactly the five application destinations, all visible at once without
 * scrolling. It briefly also carried Home, About and Contact from the
 * marketing site, which pushed it to eight items and made it scroll - and a
 * navigation bar that scrolls hides options from the person least likely to
 * discover them by swiping. Those three now live in Settings, where people
 * look for information about a product rather than in the middle of the
 * controls they use daily.
 */
export function BottomNav({ t, locale: _locale }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label={t('primaryNavigation')}>
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
    </nav>
  );
}
