import type { BucketItem, Locale } from '@/modules/data-access';
import { Check, Plus } from '@/packages/icons';

import type { GroupOrderMessageKey } from '../../i18n/group-order-messages.constants';
import { translateGroupOrder } from '../../i18n/translate-group-order.helper';
import type { CustomItemDraft } from './use-custom-item-panel.hook';

interface CustomItemPanelViewProps {
  locale: Locale;
  canCreate: boolean;
  canSetPrice: boolean;
  canApprove: boolean;
  disabled: boolean;
  pendingItems: BucketItem[];
  draft: CustomItemDraft;
  validDraft: boolean;
  approvalPrices: Record<string, string>;
  onDraftChange: (patch: Partial<CustomItemDraft>) => void;
  onSubmit: () => void;
  onApprovalPriceChange: (itemId: string, value: string) => void;
  onApprove: (itemId: string, unitPrice: number) => void;
}

export function CustomItemPanelView({
  locale,
  canCreate,
  canSetPrice,
  canApprove,
  disabled,
  pendingItems,
  draft,
  validDraft,
  approvalPrices,
  onDraftChange,
  onSubmit,
  onApprovalPriceChange,
  onApprove,
}: CustomItemPanelViewProps) {
  const translate = (key: GroupOrderMessageKey) =>
    translateGroupOrder(locale, key);

  return (
    <section className="section-card stack-md">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{translate('customItems')}</p>
          <h2>{translate('customItems')}</h2>
        </div>
      </div>

      {canCreate ? (
        <div className="custom-item-form">
          <label>
            {translate('customItemName')}
            <input
              maxLength={120}
              value={draft.name}
              disabled={disabled}
              onChange={(event) => {
                onDraftChange({ name: event.target.value });
              }}
            />
          </label>
          <label>
            {translate('customItemCategory')}
            <input
              maxLength={80}
              value={draft.category}
              disabled={disabled}
              onChange={(event) => {
                onDraftChange({ category: event.target.value });
              }}
            />
          </label>
          <label>
            {translate('customItemPrice')}
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.unitPrice}
              disabled={disabled || !canSetPrice}
              onChange={(event) => {
                onDraftChange({ unitPrice: event.target.value });
              }}
            />
          </label>
          <label className="custom-item-description">
            {translate('customItemDescription')}
            <textarea
              rows={2}
              maxLength={500}
              value={draft.description}
              disabled={disabled}
              onChange={(event) => {
                onDraftChange({ description: event.target.value });
              }}
            />
          </label>
          <button
            className="button"
            disabled={disabled || !validDraft}
            onClick={onSubmit}
          >
            <Plus />
            {translate('proposeCustomItem')}
          </button>
        </div>
      ) : null}

      {canApprove && pendingItems.length > 0 ? (
        <div className="pending-custom-items">
          {pendingItems.map((item) => {
            const value = approvalPrices[item.id] ?? String(item.unitPrice);
            const parsed = Number(value);
            const valid = Number.isFinite(parsed) && parsed >= 0;

            return (
              <article className="pending-custom-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span className="muted">
                    {translate('addedBy')} {item.createdByName ?? '—'} ·{' '}
                    {translate('awaitingApproval')}
                  </span>
                </div>
                <input
                  aria-label={`${translate('customItemPrice')} — ${item.name}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={value}
                  disabled={disabled}
                  onChange={(event) => {
                    onApprovalPriceChange(item.id, event.target.value);
                  }}
                />
                <button
                  className="button success"
                  disabled={disabled || !valid}
                  onClick={() => {
                    onApprove(item.id, parsed);
                  }}
                >
                  <Check />
                  {translate('approveItem')}
                </button>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
