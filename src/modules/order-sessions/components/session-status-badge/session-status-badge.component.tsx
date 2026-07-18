import type { OrderSessionStatus } from '@/modules/data-access';

interface SessionStatusBadgeProps {
  status: OrderSessionStatus;
  label: string;
}

export function SessionStatusBadge({
  status,
  label,
}: SessionStatusBadgeProps) {
  return (
    <span className={`session-status session-status-${status}`}>
      <span className="session-status-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
