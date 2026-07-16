import type { OrderStatus } from '@/modules/data-access';
import { useApp } from '@/modules/session';

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useApp();
  return <span className={`status status-${status}`}>{t(status)}</span>;
}
