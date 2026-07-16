import type { GroupOrderReceiptSnapshot } from '@/modules/data-access';

import type { GroupOrderMessageKey } from '../../i18n/group-order-messages.constants';

interface ReceiptByPersonProps {
  receipt: GroupOrderReceiptSnapshot;
  money: (amountMinor: number) => string;
  translate: (key: GroupOrderMessageKey) => string;
}

export function ReceiptByPerson({
  receipt,
  money,
  translate,
}: ReceiptByPersonProps) {
  return (
    <div className="receipt-person-list">
      {receipt.participantReceipts.map((participant) => (
        <article className="receipt-person-card" key={participant.userId}>
          <div className="section-heading">
            <strong>{participant.displayName}</strong>
            <strong>{money(participant.totalMinor)}</strong>
          </div>
          {participant.lines.map((line) => (
            <div
              className="detail-line"
              key={`${participant.userId}-${line.itemId}`}
            >
              <div>
                <strong>
                  {line.quantity} × {line.itemName}
                </strong>
                <span>
                  {translate('addedBy')} {line.createdByName}
                </span>
              </div>
              <strong>{money(line.lineTotalMinor)}</strong>
            </div>
          ))}
          <div className="receipt-fees">
            <span>
              {translate('vat')}: {money(participant.vatShareMinor)}
            </span>
            <span>
              {translate('service')}: {money(participant.serviceShareMinor)}
            </span>
            <span>
              {translate('delivery')}: {money(participant.deliveryShareMinor)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
