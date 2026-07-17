import type { Locale, Order } from '@/modules/data-access';
import { getOrderChargeBreakdown } from '@/modules/data-access';
import { translateGroupOrder } from '@/modules/group-orders';
import { formatMoney } from '@/shared/helpers';

interface OrderLineSummaryProps {
  order: Order;
  locale: Locale;
}

export function OrderLineSummary({ order, locale }: OrderLineSummaryProps) {
  const charges = getOrderChargeBreakdown(order);
  return (
    <section className="section-card">
      <div className="order-detail-lines">
        {order.lines.map((line) => (
          <div className="detail-line" key={line.id}>
            <div>
              <strong>
                {line.quantity} × {line.name}
              </strong>
              <span>{formatMoney(line.unitPrice, order.currency, locale)}</span>
            </div>
            <strong>
              {formatMoney(line.lineTotal, order.currency, locale)}
            </strong>
          </div>
        ))}
      </div>
      <div className="totals">
        <div>
          <span>Subtotal</span>
          <strong>{formatMoney(order.subtotal, order.currency, locale)}</strong>
        </div>
        {charges ? (
          <>
            <div>
              <span>{translateGroupOrder(locale, 'vat')}</span>
              <strong>{formatMoney(charges.vat, order.currency, locale)}</strong>
            </div>
            <div>
              <span>{translateGroupOrder(locale, 'service')}</span>
              <strong>
                {formatMoney(charges.service, order.currency, locale)}
              </strong>
            </div>
            <div>
              <span>{translateGroupOrder(locale, 'delivery')}</span>
              <strong>
                {formatMoney(charges.delivery, order.currency, locale)}
              </strong>
            </div>
          </>
        ) : null}
        <div className="grand-total">
          <span>Total</span>
          <strong>{formatMoney(order.total, order.currency, locale)}</strong>
        </div>
      </div>
    </section>
  );
}
