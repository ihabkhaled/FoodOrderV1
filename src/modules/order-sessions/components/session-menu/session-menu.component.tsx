import type {
  Locale,
  OrderSession,
  SessionMenuItemSnapshot,
} from '@/modules/data-access';

import { formatSessionMoney } from '../../helpers/order-session-view.helper';
import type { OrderSessionMessageKey } from '../../i18n/order-session-messages.constants';

interface SessionMenuProps {
  session: OrderSession;
  locale: Locale;
  quantities: Readonly<Record<string, number>>;
  canContribute: boolean;
  busyItemId: string | null;
  personalSubtotalMinor: number;
  translate: (
    locale: Locale,
    key: OrderSessionMessageKey,
  ) => string;
  onQuantityChange: (
    item: SessionMenuItemSnapshot,
    quantity: number,
  ) => void;
}

export function SessionMenu({
  session,
  locale,
  quantities,
  canContribute,
  busyItemId,
  personalSubtotalMinor,
  translate,
  onQuantityChange,
}: SessionMenuProps) {
  return (
    <section className="section-card stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{translate(locale, 'myOrder')}</p>
          <h2>{translate(locale, 'menu')}</h2>
        </div>
        <strong className="session-personal-total">
          {formatSessionMoney(personalSubtotalMinor, session.currency, locale)}
        </strong>
      </div>
      <ul className="session-menu-list plain">
        {session.menuItems.map((item) => {
          const quantity = quantities[item.id] ?? 0;
          const disabled = !canContribute || !item.active || busyItemId === item.id;
          return (
            <li className="session-menu-item" key={item.id}>
              <span className="session-menu-copy stack-xs">
                <strong>{item.name}</strong>
                {item.description ? (
                  <span className="muted">{item.description}</span>
                ) : null}
                <span className="session-menu-price">
                  {formatSessionMoney(
                    item.unitPriceMinor,
                    session.currency,
                    locale,
                  )}
                </span>
              </span>
              {item.active ? (
                <span className="quantity-control" aria-label={item.name}>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`${translate(locale, 'quantity')} - ${item.name}`}
                    disabled={disabled || quantity === 0}
                    onClick={() => {
                      onQuantityChange(item, Math.max(0, quantity - 1));
                    }}
                  >
                    −
                  </button>
                  <output aria-live="polite" aria-label={translate(locale, 'quantity')}>
                    {quantity}
                  </output>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`${translate(locale, 'quantity')} + ${item.name}`}
                    disabled={disabled || quantity >= 999}
                    onClick={() => {
                      onQuantityChange(item, quantity + 1);
                    }}
                  >
                    +
                  </button>
                </span>
              ) : (
                <span className="participant-response participant-response-removed">
                  {translate(locale, 'unavailable')}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {canContribute ? null : (
        <p className="inline-notice" role="status">
          {translate(locale, 'contributionsClosed')}
        </p>
      )}
    </section>
  );
}
