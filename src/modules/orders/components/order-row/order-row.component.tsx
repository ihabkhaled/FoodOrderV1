import type { Locale, Order } from '@/modules/data-access';
import { Trash2 } from '@/packages/icons';
import { Link } from '@/packages/router';
import { formatDateTime, formatMoney } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';

import {
  buildOrderDetailsRoute,
  ORDERS_PATH,
} from '../../routes/orders-route-paths.constants';
import { StatusBadge } from '../status-badge/status-badge.component';

interface OrderRowProps {
  readonly order: Order;
  readonly locale: Locale;
  readonly t: (key: MessageKey) => string;
  readonly onDelete: (order: Order) => void;
}

export function OrderRow({ order, locale, t, onDelete }: OrderRowProps) {
  return (
    <article className="list-row order-row">
      <Link
        to={buildOrderDetailsRoute(order.id)}
        state={{ from: ORDERS_PATH }}
        className="grow"
      >
        <div>
          <strong>
            <bdi>{order.bucketTitle}</bdi>
          </strong>
          <span className="order-row-meta">
            <span className="order-item-count">
              {order.lines.length} {t('items')}
            </span>
            <span aria-hidden="true">·</span>
            <time dateTime={order.createdAt}>
              {formatDateTime(order.createdAt, locale)}
            </time>
          </span>
        </div>
      </Link>
      <StatusBadge status={order.status} label={t(order.status)} />
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
