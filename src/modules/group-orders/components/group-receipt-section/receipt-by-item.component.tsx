import type { GroupOrderReceiptSnapshot } from '@/modules/data-access';

import type { GroupOrderMessageKey } from '../../i18n/group-order-messages.constants';

interface ReceiptByItemProps {
  receipt: GroupOrderReceiptSnapshot;
  translate: (key: GroupOrderMessageKey) => string;
}

export function ReceiptByItem({ receipt, translate }: ReceiptByItemProps) {
  return (
    <div className="receipt-item-list">
      {receipt.items.map((item) => (
        <article className="receipt-item-card" key={item.itemId}>
          <div className="section-heading">
            <div>
              <strong>{item.itemName}</strong>
              <span className="muted">
                {translate('addedBy')} {item.createdByName}
              </span>
            </div>
            <strong>×{item.totalQuantity}</strong>
          </div>
          <div className="chip-row">
            {item.orderedBy.map((participant) => (
              <span
                className="chip"
                key={`${item.itemId}-${participant.userId}`}
              >
                {participant.displayName} ×{participant.quantity}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
