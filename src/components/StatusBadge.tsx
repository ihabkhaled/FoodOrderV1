import type { OrderStatus } from '@/types/domain';
import { useApp } from '@/state/AppContext';

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useApp();
  return <span className={`status status-${status}`}>{t(status)}</span>;
}
