import { GroupReceiptSection } from '@/modules/group-orders';
import { ArrowLeft } from '@/packages/icons';
import { Link } from '@/packages/router';
import { formatDateTime } from '@/shared/helpers';
import { Loading } from '@/shared/ui';

import { OrderActionBar } from '../components/order-action-bar/order-action-bar.component';
import { OrderLineSummary } from '../components/order-line-summary/order-line-summary.component';
import { OrderParticipantsSection } from '../components/order-participants-section/order-participants-section.component';
import { StatusBadge } from '../components/status-badge/status-badge.component';
import { useOrderDetails } from '../hooks/use-order-details.hook';
import { ORDERS_PATH } from '../routes/orders-route-paths.constants';

export function OrderDetailsContainer() {
  const vm = useOrderDetails();

  if (vm.loading) return <Loading label={vm.t('loading')} />;
  const order = vm.order;
  if (!order) {
    return (
      <div className="page">
        <p className="form-error">{vm.error || vm.t('tryAgain')}</p>
      </div>
    );
  }

  const itemNames = new Map(
    order.lines.map((line) => [line.bucketItemId, line.name]),
  );

  return (
    <div className="page narrow stack-lg">
      <Link className="back-link" to={ORDERS_PATH}>
        <ArrowLeft />
        {vm.t('back')}
      </Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">
            {order.participants ? vm.t('groupOrder') : vm.t('orderDetails')}
          </p>
          <h1>{order.bucketTitle}</h1>
          <p>{formatDateTime(order.createdAt, vm.locale)}</p>
        </div>
        <StatusBadge status={order.status} label={vm.t(order.status)} />
      </header>

      <OrderLineSummary order={order} locale={vm.locale} />
      {order.participants && order.groupReceipt ? (
        <GroupReceiptSection
          receipt={order.groupReceipt}
          currency={order.currency}
          locale={vm.locale}
        />
      ) : null}
      {order.participants ? (
        <OrderParticipantsSection
          participants={order.participants}
          itemNames={itemNames}
          translate={vm.t}
        />
      ) : null}
      {order.notes ? (
        <section className="section-card">
          <h2>{vm.t('notes')}</h2>
          <p>{order.notes}</p>
        </section>
      ) : null}
      <section className="section-card metadata-grid">
        <div>
          <span>{vm.t('created')}</span>
          <strong>{formatDateTime(order.createdAt, vm.locale)}</strong>
        </div>
        <div>
          <span>{vm.t('updated')}</span>
          <strong>{formatDateTime(order.updatedAt, vm.locale)}</strong>
        </div>
        {order.sourceBucketRevision === null ? null : (
          <div>
            <span>{vm.t('bucketRevision')}</span>
            <strong>#{order.sourceBucketRevision}</strong>
          </div>
        )}
      </section>
      <OrderActionBar
        order={order}
        translate={vm.t}
        onRepeat={() => {
          void vm.repeat();
        }}
        onTransition={(status) => {
          void vm.transition(status);
        }}
      />
    </div>
  );
}
