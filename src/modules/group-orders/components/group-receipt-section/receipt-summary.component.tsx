import type { GroupOrderReceiptSnapshot } from '@/modules/data-access';

import type { GroupOrderMessageKey } from '../../i18n/group-order-messages.constants';

interface ReceiptSummaryProps {
  receipt: GroupOrderReceiptSnapshot;
  money: (amountMinor: number) => string;
  translate: (key: GroupOrderMessageKey) => string;
}

export function ReceiptSummary({
  receipt,
  money,
  translate,
}: ReceiptSummaryProps) {
  return (
    <div className="receipt-summary-grid">
      <div>
        <span>{translate('itemSubtotal')}</span>
        <strong>{money(receipt.itemSubtotalMinor)}</strong>
      </div>
      <div>
        <span>{translate('vat')}</span>
        <strong>{money(receipt.vatMinor)}</strong>
      </div>
      <div>
        <span>{translate('service')}</span>
        <strong>{money(receipt.serviceMinor)}</strong>
      </div>
      <div>
        <span>{translate('delivery')}</span>
        <strong>{money(receipt.deliveryMinor)}</strong>
      </div>
      <div className="grand-total">
        <span>{translate('finalTotal')}</span>
        <strong>{money(receipt.grandTotalMinor)}</strong>
      </div>
    </div>
  );
}
