import { StatusBadge } from '@/components/StatusBadge';
import type { Locale, Order } from '@/modules/data-access';
import { Trash2 } from '@/packages/icons';
import { Link } from '@/packages/router';
import { formatDateTime, formatMoney } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';

interface OrderRowProps {
  readonly order: Order;
  readonly locale: Locale;
  readonly t: (key: MessageKey) => string;
  readonly onDelete: (order: Order) => void;
}

export function OrderRow({ order, locale, t, onDelete }: OrderRowProps) {
  return (
    <article className="list-row order-row">
      <Link to={`/orders/${order.id}`} className="grow">
        <div>
          <strong>{order.bucketTitle}</strong>
          <span>
            {order.lines.length} {t('items')} ·{' '}
            {formatDateTime(order.createdAt, locale)}
          </span>
        </div>
      </Link>
      <StatusBadge status={order.status} />
      <strong>{formatMoney(order.total, order.currency, locale)}</strong>
      <button
        type="button"
        className="icon-button danger-ghost"
        onClick={() => {
          onDelete(order);
        }}
        aria-label={`${t('delete')} — ${order.bucketTitle}`}
      >
        <Trash2 />
      </button>
    </article>
  );
}
