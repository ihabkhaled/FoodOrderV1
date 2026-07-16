import { BUCKETS_PATH } from '@/modules/buckets';
import type { Theme } from '@/modules/data-access';
import { ORDERS_PATH } from '@/modules/orders';
import { SETTINGS_PATH } from '@/modules/settings';
import { SOCIAL_PATH } from '@/modules/social';
import {
  Home,
  ListOrdered,
  Monitor,
  Moon,
  Settings,
  ShoppingBasket,
  Sun,
  Users,
} from '@/packages/icons';
import type { MessageKey } from '@/shared/i18n';

import { HOME_PATH } from '../router/app-route-paths.constants';

export const NAV_ITEMS: { to: string; icon: typeof Home; key: MessageKey }[] = [
  { to: HOME_PATH, icon: Home, key: 'dashboard' },
  { to: BUCKETS_PATH, icon: ShoppingBasket, key: 'buckets' },
  { to: SOCIAL_PATH, icon: Users, key: 'members' },
  { to: ORDERS_PATH, icon: ListOrdered, key: 'orders' },
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
