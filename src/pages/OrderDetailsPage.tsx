import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { BackLink } from '@/components/BackLink';
import { GroupReceiptSection } from '@/components/GroupReceiptSection';
import { Loading } from '@/components/Loading';
import { OrderActionBar } from '@/components/OrderActionBar';
import { OrderParticipantsSection } from '@/components/OrderParticipantsSection';
import { StatusBadge } from '@/components/StatusBadge';
import { translateGroupOrder } from '@/i18n/groupOrderMessages';
import { formatDateTime } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import {
  buildRepeatedOrderDraft,
  getOrderChargeBreakdown,
} from '@/lib/order';
import { dataService, orderLifecycleService } from '@/services';
import { useApp } from '@/state/AppContext';
import type { Order, OrderStatus } from '@/types/domain';

function OrderLineSummary({
  order,
  locale,
}: {
  order: Order;
  locale: 'en' | 'ar';
}) {
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
            <strong>{formatMoney(line.lineTotal, order.currency, locale)}</strong>
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
              <strong>{formatMoney(charges.service, order.currency, locale)}</strong>
            </div>
            <div>
              <span>{translateGroupOrder(locale, 'delivery')}</span>
              <strong>{formatMoney(charges.delivery, order.currency, locale)}</strong>
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

export function OrderDetailsPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, locale, t, showToast } = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !orderId) return;
    void dataService
      .getOrder(user.id, orderId)
      .then((value) => {
        if (!value) throw new Error(t('tryAgain'));
        setOrder(value);
      })
      .catch((error_: unknown) => {
        setError(error_ instanceof Error ? error_.message : t('tryAgain'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orderId, user, t]);

  const transition = async (status: OrderStatus) => {
    if (!user || !order) return;
    try {
      const saved = order.participants
        ? await orderLifecycleService.transitionGroupOrder(user, order.id, status)
        : await dataService.updateOrderStatus(user.id, order.id, status);
      setOrder(saved);
      showToast(t('orderUpdated'), 'success');
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    }
  };

  const repeat = async () => {
    if (!user || !order) return;
    try {
      const created = order.participants
        ? await orderLifecycleService.repeatGroupOrder(user, order.id)
        : await dataService.createOrder(user.id, buildRepeatedOrderDraft(order));
      showToast(t('draftFromOrder'), 'success');
      await navigate(`/orders/${created.id}`);
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    }
  };

  if (loading) return <Loading />;
  if (!order) {
    return (
      <div className="page">
        <p className="form-error">{error || t('tryAgain')}</p>
      </div>
    );
  }

  const itemNames = new Map(
    order.lines.map((line) => [line.bucketItemId, line.name]),
  );

  return (
    <div className="page narrow stack-lg">
      <BackLink fallback="/orders" label={t('back')} />
      <header className="page-heading">
        <div>
          <p className="eyebrow">
            {order.participants ? t('groupOrder') : t('orderDetails')}
          </p>
          <h1>{order.bucketTitle}</h1>
          <p>{formatDateTime(order.createdAt, locale)}</p>
        </div>
        <StatusBadge status={order.status} />
      </header>

      <OrderLineSummary order={order} locale={locale} />
      {order.participants && order.groupReceipt ? (
        <GroupReceiptSection
          receipt={order.groupReceipt}
          currency={order.currency}
          locale={locale}
        />
      ) : null}
      {order.participants ? (
        <OrderParticipantsSection
          participants={order.participants}
          itemNames={itemNames}
          translate={t}
        />
      ) : null}
      {order.notes ? (
        <section className="section-card">
          <h2>{t('notes')}</h2>
          <p>{order.notes}</p>
        </section>
      ) : null}
      <section className="section-card metadata-grid">
        <div>
          <span>{t('created')}</span>
          <strong>{formatDateTime(order.createdAt, locale)}</strong>
        </div>
        <div>
          <span>{t('updated')}</span>
          <strong>{formatDateTime(order.updatedAt, locale)}</strong>
        </div>
        {order.sourceBucketRevision === null ? null : (
          <div>
            <span>{t('bucketRevision')}</span>
            <strong>#{order.sourceBucketRevision}</strong>
          </div>
        )}
      </section>
      <OrderActionBar
        order={order}
        translate={t}
        onRepeat={() => {
          void repeat();
        }}
        onTransition={(status) => {
          void transition(status);
        }}
      />
    </div>
  );
}
