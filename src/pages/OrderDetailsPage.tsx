import { ArrowLeft, Check, Copy, ReceiptText, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Loading } from '@/components/Loading';
import { StatusBadge } from '@/components/StatusBadge';
import { translateGroupOrder } from '@/i18n/groupOrderMessages';
import { formatDateTime } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { canTransitionOrder } from '@/lib/order';
import { dataService } from '@/services';
import { useApp } from '@/state/AppContext';
import type { Order, OrderStatus } from '@/types/domain';

type ReceiptView = 'summary' | 'person' | 'item';

export function OrderDetailsPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, locale, t, showToast } = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receiptView, setReceiptView] = useState<ReceiptView>('summary');
  const gt = (key: Parameters<typeof translateGroupOrder>[1]) =>
    translateGroupOrder(locale, key);

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
      const saved = await dataService.updateOrderStatus(user.id, order.id, status);
      setOrder(saved);
      showToast(t('orderUpdated'), 'success');
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    }
  };

  const repeat = async () => {
    if (!user || !order) return;
    try {
      const created = await dataService.createOrder(user.id, {
        bucketId: order.bucketId,
        bucketTitle: order.bucketTitle,
        currency: order.currency,
        lines: order.lines.map(({ id, bucketItemId, name, quantity, unitPrice }) => ({
          id,
          bucketItemId,
          name,
          quantity,
          unitPrice,
        })),
        notes: order.notes,
        status: 'draft',
      });
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

  const itemNames = new Map(order.lines.map((line) => [line.bucketItemId, line.name]));
  const receipt = order.groupReceipt;
  const moneyFromMinor = (amountMinor: number) =>
    formatMoney(amountMinor / 100, order.currency, locale);

  return (
    <div className="page narrow stack-lg">
      <Link className="back-link" to="/orders">
        <ArrowLeft />
        {t('back')}
      </Link>

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

      <section className="section-card">
        <div className="order-detail-lines">
          {order.lines.map((line) => (
            <div className="detail-line" key={line.id}>
              <div>
                <strong>
                  {line.quantity} × {line.name}
                </strong>
                <span>
                  {formatMoney(line.unitPrice, order.currency, locale)} {t('each')}
                </span>
              </div>
              <strong>{formatMoney(line.lineTotal, order.currency, locale)}</strong>
            </div>
          ))}
        </div>
        <div className="totals">
          <div>
            <span>{t('subtotal')}</span>
            <strong>{formatMoney(order.subtotal, order.currency, locale)}</strong>
          </div>
          <div className="grand-total">
            <span>{t('total')}</span>
            <strong>{formatMoney(order.total, order.currency, locale)}</strong>
          </div>
        </div>
      </section>

      {receipt ? (
        <section className="section-card stack-md">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{gt('receipt')}</p>
              <h2>
                <ReceiptText size={18} aria-hidden="true" />
                {receipt.participantReceipts.length > 1
                  ? gt('ownerReceipt')
                  : gt('personalReceipt')}
              </h2>
            </div>
          </div>

          <div className="segmented-control" role="tablist">
            <button
              className={receiptView === 'summary' ? 'active' : ''}
              role="tab"
              aria-selected={receiptView === 'summary'}
              onClick={() => {
                setReceiptView('summary');
              }}
            >
              {gt('receiptSummary')}
            </button>
            <button
              className={receiptView === 'person' ? 'active' : ''}
              role="tab"
              aria-selected={receiptView === 'person'}
              onClick={() => {
                setReceiptView('person');
              }}
            >
              {gt('byPerson')}
            </button>
            <button
              className={receiptView === 'item' ? 'active' : ''}
              role="tab"
              aria-selected={receiptView === 'item'}
              onClick={() => {
                setReceiptView('item');
              }}
            >
              {gt('byItem')}
            </button>
          </div>

          {receiptView === 'summary' ? (
            <div className="receipt-summary-grid">
              <div>
                <span>{gt('itemSubtotal')}</span>
                <strong>{moneyFromMinor(receipt.itemSubtotalMinor)}</strong>
              </div>
              <div>
                <span>{gt('vat')}</span>
                <strong>{moneyFromMinor(receipt.vatMinor)}</strong>
              </div>
              <div>
                <span>{gt('service')}</span>
                <strong>{moneyFromMinor(receipt.serviceMinor)}</strong>
              </div>
              <div>
                <span>{gt('delivery')}</span>
                <strong>{moneyFromMinor(receipt.deliveryMinor)}</strong>
              </div>
              <div className="grand-total">
                <span>{gt('finalTotal')}</span>
                <strong>{moneyFromMinor(receipt.grandTotalMinor)}</strong>
              </div>
            </div>
          ) : null}

          {receiptView === 'person' ? (
            <div className="receipt-person-list">
              {receipt.participantReceipts.map((participant) => (
                <article className="receipt-person-card" key={participant.userId}>
                  <div className="section-heading">
                    <strong>{participant.displayName}</strong>
                    <strong>{moneyFromMinor(participant.totalMinor)}</strong>
                  </div>
                  {participant.lines.map((line) => (
                    <div className="detail-line" key={`${participant.userId}-${line.itemId}`}>
                      <div>
                        <strong>
                          {line.quantity} × {line.itemName}
                        </strong>
                        <span>
                          {gt('addedBy')} {line.createdByName}
                        </span>
                      </div>
                      <strong>{moneyFromMinor(line.lineTotalMinor)}</strong>
                    </div>
                  ))}
                  <div className="receipt-fees">
                    <span>{gt('vat')}: {moneyFromMinor(participant.vatShareMinor)}</span>
                    <span>{gt('service')}: {moneyFromMinor(participant.serviceShareMinor)}</span>
                    <span>{gt('delivery')}: {moneyFromMinor(participant.deliveryShareMinor)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {receiptView === 'item' ? (
            <div className="receipt-item-list">
              {receipt.items.map((item) => (
                <article className="receipt-item-card" key={item.itemId}>
                  <div className="section-heading">
                    <div>
                      <strong>{item.itemName}</strong>
                      <span className="muted">
                        {gt('addedBy')} {item.createdByName}
                      </span>
                    </div>
                    <strong>×{item.totalQuantity}</strong>
                  </div>
                  <div className="chip-row">
                    {item.orderedBy.map((participant) => (
                      <span className="chip" key={`${item.itemId}-${participant.userId}`}>
                        {participant.displayName} ×{participant.quantity}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {order.participants?.length ? (
        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t('participants')}</p>
              <h2>
                <Users size={18} aria-hidden="true" /> {order.participants.length}
              </h2>
            </div>
          </div>
          <div className="participant-breakdown">
            {order.participants.map((participant) => (
              <div className="participant-row" key={participant.userId}>
                <strong>{participant.displayName}</strong>
                <span>
                  {Object.entries(participant.quantities)
                    .map(
                      ([itemId, quantity]) =>
                        `${itemNames.get(itemId) ?? t('item')} ×${quantity}`,
                    )
                    .join(' · ')}
                </span>
              </div>
            ))}
          </div>
        </section>
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

      <div className="sticky-actions wrap">
        <button
          className="button secondary"
          onClick={() => {
            void repeat();
          }}
        >
          <Copy />
          {t('repeatOrder')}
        </button>
        {canTransitionOrder(order.status, 'placed') ? (
          <button
            className="button"
            onClick={() => {
              void transition('placed');
            }}
          >
            {t('placeOrder')}
          </button>
        ) : null}
        {canTransitionOrder(order.status, 'completed') ? (
          <button
            className="button success"
            onClick={() => {
              void transition('completed');
            }}
          >
            <Check />
            {t('completeOrder')}
          </button>
        ) : null}
        {canTransitionOrder(order.status, 'cancelled') ? (
          <button
            className="button danger"
            onClick={() => {
              void transition('cancelled');
            }}
          >
            <X />
            {t('cancelOrder')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
