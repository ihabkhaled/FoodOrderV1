import type { OrderStatus } from '@/modules/data-access';

interface StatusBadgeProps {
  status: OrderStatus;
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return <span className={`status status-${status}`}>{label}</span>;
}
