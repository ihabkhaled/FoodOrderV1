import { useApp } from '@/state/AppContext';
import type { OrderStatus } from '@/types/domain';

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useApp();
  return <span className={`status status-${status}`}>{t(status)}</span>;
}
