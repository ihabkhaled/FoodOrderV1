import type {
  CurrencyCode,
  GroupOrderReceiptSnapshot,
  Locale,
} from '@/modules/data-access';
import { ReceiptText } from '@/packages/icons';
import { formatMoney } from '@/shared/helpers';

import type { GroupOrderMessageKey } from '../../i18n/group-order-messages.constants';
import { translateGroupOrder } from '../../i18n/translate-group-order.helper';
import { ReceiptByItem } from './receipt-by-item.component';
import { ReceiptByPerson } from './receipt-by-person.component';
import { ReceiptSummary } from './receipt-summary.component';
import type { ReceiptView } from './use-group-receipt-section.hook';

interface GroupReceiptSectionViewProps {
  receipt: GroupOrderReceiptSnapshot;
  currency: CurrencyCode;
  locale: Locale;
  view: ReceiptView;
  onViewChange: (view: ReceiptView) => void;
}

export function GroupReceiptSectionView({
  receipt,
  currency,
  locale,
  view,
  onViewChange,
}: GroupReceiptSectionViewProps) {
  const translate = (key: GroupOrderMessageKey) =>
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
            onViewChange('summary');
          }}
        >
          {translate('receiptSummary')}
        </button>
        <button
          className={view === 'person' ? 'active' : ''}
          role="tab"
          aria-selected={view === 'person'}
          onClick={() => {
            onViewChange('person');
          }}
        >
          {translate('byPerson')}
        </button>
        <button
          className={view === 'item' ? 'active' : ''}
          role="tab"
          aria-selected={view === 'item'}
          onClick={() => {
            onViewChange('item');
          }}
        >
          {translate('byItem')}
        </button>
      </div>

      {view === 'summary' ? (
        <ReceiptSummary receipt={receipt} money={money} translate={translate} />
      ) : null}
      {view === 'person' ? (
        <ReceiptByPerson
          receipt={receipt}
          money={money}
          translate={translate}
        />
      ) : null}
      {view === 'item' ? (
        <ReceiptByItem receipt={receipt} translate={translate} />
      ) : null}
    </section>
  );
}
