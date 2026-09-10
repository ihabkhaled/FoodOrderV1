import { BUCKETS_PATH } from '@/modules/buckets';
import type { Theme } from '@/modules/data-access';
import { ORDER_SESSIONS_PATH } from '@/modules/order-sessions';
import { SETTINGS_PATH } from '@/modules/settings';
import { SOCIAL_PATH } from '@/modules/social';
import {
  CalendarClock,
  LayoutDashboard,
  Monitor,
  Moon,
  Settings,
  ShoppingBasket,
  Sun,
  Users,
} from '@/packages/icons';
import type { MessageKey } from '@/shared/i18n';

import { HOME_PATH } from '../router/app-route-paths.constants';

/**
 * The five destinations of the application, and deliberately only five.
 *
 * They must all be visible at once on the narrowest supported phone. A bar
 * that scrolls hides options from exactly the person who most needs to see
 * them, so nothing is added here without removing something.
 *
 * Orders is not here: the home screen already lists recent orders, and an
 * order is something you reach through the menu or round it belongs to.
 * Rounds is here because it is the feature the product is built around and it
 * previously had no entry point at all.
 */
export const NAV_ITEMS: {
  to: string;
  icon: typeof LayoutDashboard;
  key: MessageKey;
}[] = [
  { to: HOME_PATH, icon: LayoutDashboard, key: 'dashboard' },
  { to: BUCKETS_PATH, icon: ShoppingBasket, key: 'buckets' },
  { to: ORDER_SESSIONS_PATH, icon: CalendarClock, key: 'rounds' },
  { to: SOCIAL_PATH, icon: Users, key: 'members' },
  { to: SETTINGS_PATH, icon: Settings, key: 'settings' },
];

export const THEME_ICON: Record<Theme, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export const THEME_LABEL: Record<Theme, MessageKey> = {
  system: 'themeSystem',
  light: 'themeLight',
  dark: 'themeDark',
};
