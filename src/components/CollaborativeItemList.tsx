import { translateGroupOrder } from '@/i18n/groupOrderMessages';
import type { MessageKey } from '@/i18n/messages';
import { formatMoney } from '@/lib/money';
import type { BucketContribution, BucketItem, CurrencyCode, Locale } from '@/modules/data-access';
import { Minus, Plus } from '@/packages/icons';

export interface CollaborativePendingChange {
  target: number;
  mutationId: string;
  state: 'debouncing' | 'sending' | 'failed';
}

interface CollaborativeItemListProps {
  items: BucketItem[];
  aggregate: Record<string, number>;
  contributions: BucketContribution[];
  currentUserId: string;
  currentQuantities: Record<string, number>;
  pending: Record<string, CollaborativePendingChange>;
  currency: CurrencyCode;
  locale: Locale;
  canContribute: boolean;
  translate: (key: MessageKey) => string;
  onAdjust: (itemId: string, delta: number) => void;
  onRetry: (itemId: string) => void;
}

export function CollaborativeItemList({
  items,
  aggregate,
  contributions,
  currentUserId,
  currentQuantities,
  pending,
  currency,
  locale,
  canContribute,
  translate,
  onAdjust,
  onRetry,
}: CollaborativeItemListProps) {
  const addedByLabel = translateGroupOrder(locale, 'addedBy');

  return (
    <section className="section-card order-picker">
      {contributions.length === 0 && canContribute ? (
        <p className="muted">{translate('noContributionsYet')}</p>
      ) : null}
      {items.map((item) => {
        const change = pending[item.id];
        const mine = change?.target ?? currentQuantities[item.id] ?? 0;
        const total = aggregate[item.id] ?? 0;
        const others = contributions
          .filter(
            (contribution) =>
              contribution.userId !== currentUserId &&
              (contribution.quantities[item.id] ?? 0) > 0,
          )
          .map(
            (contribution) =>
              `${contribution.displayName} ×${contribution.quantities[item.id]}`,
          );

        return (
          <article className="order-line" key={item.id}>
            <div>
              <h3>{item.name}</h3>
              <span>
                {formatMoney(item.unitPrice, currency, locale)} ·{' '}
                {translate('everyoneTotal')}: {total}
              </span>
              <span className="participants-line">
                {addedByLabel} {item.createdByName ?? '—'}
              </span>
              {others.length > 0 ? (
                <span className="participants-line">{others.join(' · ')}</span>
              ) : null}
              {change?.state === 'sending' || change?.state === 'debouncing' ? (
                <span className="pending-hint">{translate('pendingSync')}</span>
              ) : null}
              {change?.state === 'failed' ? (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    onRetry(item.id);
                  }}
                >
                  {translate('retry')}
                </button>
              ) : null}
            </div>
            {canContribute ? (
              <div className="quantity-control">
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => {
                    onAdjust(item.id, -1);
                  }}
                  aria-label={`${translate('decrease')} ${item.name}`}
                >
                  <Minus />
                </button>
                <output aria-label={`${translate('quantityFor')} ${item.name}`}>
                  {mine}
                </output>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => {
                    onAdjust(item.id, 1);
                  }}
                  aria-label={`${translate('increase')} ${item.name}`}
                >
                  <Plus />
                </button>
              </div>
            ) : (
              <strong className="aggregate-only">{total}</strong>
            )}
          </article>
        );
      })}
    </section>
  );
}
