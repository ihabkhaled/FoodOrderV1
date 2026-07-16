import type { DashboardSummary, Locale } from '@/modules/data-access';
import { buildOrderDetailsRoute, ORDERS_PATH, StatusBadge } from '@/modules/orders';
import { Link } from '@/packages/router';
import { formatDateTime, formatMoney } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';

interface RecentOrdersSectionProps {
  recentOrders: DashboardSummary['recentOrders'];
  locale: Locale;
  t: (key: MessageKey) => string;
}

export function RecentOrdersSection({
  recentOrders,
  locale,
  t,
}: RecentOrdersSectionProps) {
  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t('recentOrders')}</p>
          <h2>{t('myOrders')}</h2>
        </div>
        <Link to={ORDERS_PATH}>{t('orders')}</Link>
      </div>
      {recentOrders.length > 0 ? (
        <div className="list">
          {recentOrders.map((order) => (
            <Link
              to={buildOrderDetailsRoute(order.id)}
              className="list-row"
              key={order.id}
            >
              <div>
                <strong>{order.bucketTitle}</strong>
                <span>{formatDateTime(order.createdAt, locale)}</span>
              </div>
              <div className="row-end">
                <StatusBadge status={order.status} label={t(order.status)} />
                <strong>
                  {formatMoney(order.total, order.currency, locale)}
                </strong>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="muted">{t('emptyOrders')}</p>
      )}
    </section>
  );
}
