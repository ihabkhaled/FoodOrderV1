import type { Order, OrderStatus } from '@/modules/data-access';
import { canTransitionOrder } from '@/modules/data-access';
import { Check, Copy, X } from '@/packages/icons';
import type { MessageKey } from '@/shared/i18n';

interface OrderActionBarProps {
  order: Order;
  translate: (key: MessageKey) => string;
  onRepeat: () => void;
  onTransition: (status: OrderStatus) => void;
}

export function OrderActionBar({
  order,
  translate,
  onRepeat,
  onTransition,
}: OrderActionBarProps) {
  const canPlace = canTransitionOrder(order.status, 'placed');
  const canComplete = canTransitionOrder(order.status, 'completed');
  const canCancel = canTransitionOrder(order.status, 'cancelled');

  return (
    <div className="sticky-actions wrap">
      <button className="button secondary" onClick={onRepeat}>
        <Copy />
        {translate('repeatOrder')}
      </button>
      {canPlace ? (
        <button
          className="button"
          onClick={() => {
            onTransition('placed');
          }}
        >
          {translate('placeOrder')}
        </button>
      ) : null}
      {canComplete ? (
        <button
          className="button success"
          onClick={() => {
            onTransition('completed');
          }}
        >
          <Check />
          {translate('completeOrder')}
        </button>
      ) : null}
      {canCancel ? (
        <button
          className="button danger"
          onClick={() => {
            onTransition('cancelled');
          }}
        >
          <X />
          {translate('cancelOrder')}
        </button>
      ) : null}
    </div>
  );
}
