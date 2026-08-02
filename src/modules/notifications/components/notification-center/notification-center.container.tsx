import type { AppNotification, Locale } from '@/modules/data-access';

import { useNotificationCenter } from '../../hooks/use-notification-center.hook';
import { NotificationCenterView } from './notification-center.component';

interface NotificationCenterProps {
  notifications: AppNotification[];
  loading: boolean;
  locale: Locale;
  placement: 'topbar' | 'sidebar';
  onMarkRead: (notificationIds: string[]) => Promise<void>;
}

export function NotificationCenter({
  notifications,
  loading,
  locale,
  placement,
  onMarkRead,
}: NotificationCenterProps) {
  const vm = useNotificationCenter({ notifications, locale, onMarkRead });

  return (
    <NotificationCenterView
      notifications={notifications}
      loading={loading}
      locale={locale}
      placement={placement}
      open={vm.open}
      rootRef={vm.rootRef}
      unreadCount={vm.unreadCount}
      s={vm.s}
      onToggle={vm.toggle}
      onMarkAllRead={vm.markAllRead}
      onOpenNotification={vm.openNotification}
    />
  );
}
