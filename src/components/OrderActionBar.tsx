import { Check, Copy, X } from 'lucide-react';

import type { MessageKey } from '@/i18n/messages';
import { canTransitionOrder } from '@/lib/order';
import type { Order, OrderStatus } from '@/types/domain';

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
