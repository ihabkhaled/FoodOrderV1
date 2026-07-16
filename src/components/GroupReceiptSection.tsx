import { useState } from 'react';

import { translateGroupOrder } from '@/i18n/groupOrderMessages';
import { formatMoney } from '@/lib/money';
import { ReceiptText } from '@/packages/icons';
import type {
  CurrencyCode,
  GroupOrderReceiptSnapshot,
  Locale,
} from '@/types/domain';

type ReceiptView = 'summary' | 'person' | 'item';

interface GroupReceiptSectionProps {
  receipt: GroupOrderReceiptSnapshot;
  currency: CurrencyCode;
  locale: Locale;
}

function ReceiptSummary({
  receipt,
  money,
  translate,
}: {
  receipt: GroupOrderReceiptSnapshot;
  money: (amountMinor: number) => string;
  translate: (key: Parameters<typeof translateGroupOrder>[1]) => string;
}) {
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

function ReceiptByPerson({
  receipt,
  money,
  translate,
}: {
  receipt: GroupOrderReceiptSnapshot;
  money: (amountMinor: number) => string;
  translate: (key: Parameters<typeof translateGroupOrder>[1]) => string;
}) {
  return (
    <div className="receipt-person-list">
      {receipt.participantReceipts.map((participant) => (
        <article className="receipt-person-card" key={participant.userId}>
          <div className="section-heading">
            <strong>{participant.displayName}</strong>
            <strong>{money(participant.totalMinor)}</strong>
          </div>
          {participant.lines.map((line) => (
            <div className="detail-line" key={`${participant.userId}-${line.itemId}`}>
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

function ReceiptByItem({
  receipt,
  translate,
}: {
  receipt: GroupOrderReceiptSnapshot;
  translate: (key: Parameters<typeof translateGroupOrder>[1]) => string;
}) {
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
              <span className="chip" key={`${item.itemId}-${participant.userId}`}>
                {participant.displayName} ×{participant.quantity}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export function GroupReceiptSection({
  receipt,
  currency,
  locale,
}: GroupReceiptSectionProps) {
  const [view, setView] = useState<ReceiptView>('summary');
  const translate = (key: Parameters<typeof translateGroupOrder>[1]) =>
    translateGroupOrder(locale, key);
  const money = (amountMinor: number) =>
    formatMoney(amountMinor / 100, currency, locale);

  return (
    <section className="section-card stack-md">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{translate('receipt')}</p>
          <h2>
            <ReceiptText size={18} aria-hidden="true" />
            {receipt.participantReceipts.length > 1
              ? translate('ownerReceipt')
              : translate('personalReceipt')}
          </h2>
        </div>
      </div>

      <div className="segmented-control" role="tablist">
        <button
          className={view === 'summary' ? 'active' : ''}
          role="tab"
          aria-selected={view === 'summary'}
          onClick={() => {
            setView('summary');
          }}
        >
          {translate('receiptSummary')}
        </button>
        <button
          className={view === 'person' ? 'active' : ''}
          role="tab"
          aria-selected={view === 'person'}
          onClick={() => {
            setView('person');
          }}
        >
          {translate('byPerson')}
        </button>
        <button
          className={view === 'item' ? 'active' : ''}
          role="tab"
          aria-selected={view === 'item'}
          onClick={() => {
            setView('item');
          }}
        >
          {translate('byItem')}
        </button>
      </div>

      {view === 'summary' ? (
        <ReceiptSummary receipt={receipt} money={money} translate={translate} />
      ) : null}
      {view === 'person' ? (
        <ReceiptByPerson receipt={receipt} money={money} translate={translate} />
      ) : null}
      {view === 'item' ? (
        <ReceiptByItem receipt={receipt} translate={translate} />
      ) : null}
    </section>
  );
}
