import { useState } from 'react';

import { translateGroupOrder } from '@/i18n/groupOrderMessages';
import type { BucketItem, Locale } from '@/modules/data-access';
import { Check, Plus } from '@/packages/icons';

interface CustomItemDraft {
  name: string;
  description: string;
  category: string;
  unitPrice: string;
}

interface CustomItemPanelProps {
  locale: Locale;
  canCreate: boolean;
  canSetPrice: boolean;
  canApprove: boolean;
  disabled: boolean;
  pendingItems: BucketItem[];
  onAdd: (input: {
    name: string;
    description: string;
    category: string;
    unitPrice: number;
  }) => void;
  onApprove: (itemId: string, unitPrice: number) => void;
}

const EMPTY_DRAFT: CustomItemDraft = {
  name: '',
  description: '',
  category: '',
  unitPrice: '0',
};

export function CustomItemPanel({
  locale,
  canCreate,
  canSetPrice,
  canApprove,
  disabled,
  pendingItems,
  onAdd,
  onApprove,
}: CustomItemPanelProps) {
  const translate = (key: Parameters<typeof translateGroupOrder>[1]) =>
    translateGroupOrder(locale, key);
  const [draft, setDraft] = useState<CustomItemDraft>(EMPTY_DRAFT);
  const [approvalPrices, setApprovalPrices] = useState<Record<string, string>>({});
  const parsedPrice = Number(draft.unitPrice);
  const validDraft =
    draft.name.trim().length > 0 &&
    Number.isFinite(parsedPrice) &&
    parsedPrice >= 0;

  if (!canCreate && (!canApprove || pendingItems.length === 0)) return null;

  const submit = () => {
    if (!validDraft) return;
    onAdd({
      name: draft.name,
      description: draft.description,
      category: draft.category,
      unitPrice: parsedPrice,
    });
    setDraft(EMPTY_DRAFT);
  };

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
                setDraft((current) => ({ ...current, name: event.target.value }));
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
                setDraft((current) => ({ ...current, category: event.target.value }));
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
                setDraft((current) => ({ ...current, unitPrice: event.target.value }));
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
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }));
              }}
            />
          </label>
          <button
            className="button"
            disabled={disabled || !validDraft}
            onClick={submit}
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
                    setApprovalPrices((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }));
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
