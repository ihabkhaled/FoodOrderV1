import type { RefObject } from 'react';

import type { AppNotification, Locale } from '@/modules/data-access';
import type { SocialMessageKey } from '@/modules/social';

export interface NotificationCenterViewProps {
  notifications: AppNotification[];
  locale: Locale;
  placement: 'topbar' | 'sidebar';
  open: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
  unreadCount: number;
  s: (key: SocialMessageKey) => string;
  onToggle: () => void;
  onMarkAllRead: () => void;
  onOpenNotification: (notification: AppNotification) => void;
}
