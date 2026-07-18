import { Minus, Plus } from '@/packages/icons';
import { Link } from '@/packages/router';

import {
  formatSessionInviteMoney,
  sessionInviteResponseMessageKey,
} from '../../helpers/session-invite-view.helper';
import type { GuestSessionOrderProps } from '../../types/session-invite-ui.types';

export function GuestSessionOrder({
  locale,
  view,
  busyItemId,
  responseBusy,
  linking,
  authenticated,
  loginPath,
  registerPath,
  translate,
  onQuantityChange,
  onResponseChange,
  onLinkAccount,
}: GuestSessionOrderProps) {
  const responseKey = sessionInviteResponseMessageKey(view.participantResponse);
  const contributionOpen = view.preview.isCollecting;

  return (
    <div className="guest-session-order stack-lg">
      <header className="session-invite-hero stack">
        <span
          className={`session-invite-status ${contributionOpen ? 'is-open' : 'is-closed'}`}
        >
          {translate(locale, contributionOpen ? 'orderOpen' : 'orderClosed')}
        </span>
        <div className="stack-xs">
          <p className="eyebrow">{translate(locale, 'myOrder')}</p>
          <h1>{view.preview.title}</h1>
          <p className="muted">
            {translate(locale, 'organizedBy', {
              name: view.preview.organizerDisplayName,
            })}
          </p>
        </div>
        <div className="guest-response-summary">
          <span>{translate(locale, 'currentStatus')}</span>
          <strong>{translate(locale, responseKey)}</strong>
        </div>
      </header>

      {!contributionOpen ? (
        <p className="session-invite-inline-notice" role="status">
          {translate(locale, 'contributionsClosed')}
        </p>
      ) : null}

      <section className="session-invite-menu-card stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{translate(locale, 'menu')}</p>
            <h2>{translate(locale, 'myOrder')}</h2>
          </div>
          <strong className="session-invite-total">
            {formatSessionInviteMoney(
              view.personalSubtotalMinor,
              view.preview,
              locale,
            )}
          </strong>
        </div>
        <div className="guest-menu-list">
          {view.menuItems.map((item) => {
            const quantity = view.quantities[item.id] ?? 0;
            const busy = busyItemId === item.id;
            const disabled = !contributionOpen || !item.active || busy;
            return (
              <article className="guest-menu-item" key={item.id}>
                <div className="guest-menu-item-copy">
                  <div>
                    <h3>{item.name}</h3>
                    {item.description ? (
                      <p className="muted">{item.description}</p>
                    ) : null}
                  </div>
                  <strong>
                    {formatSessionInviteMoney(
                      item.unitPriceMinor,
                      view.preview,
                      locale,
                    )}
                  </strong>
                </div>
                {!item.active ? (
                  <span className="session-invite-unavailable">
                    {translate(locale, 'unavailable')}
                  </span>
                ) : (
                  <div
                    className="guest-quantity-control"
                    aria-label={translate(locale, 'quantityFor', {
                      name: item.name,
                    })}
                  >
                    <button
                      type="button"
                      disabled={disabled || quantity === 0}
                      aria-label={translate(locale, 'decreaseQuantity', {
                        name: item.name,
                      })}
                      onClick={() => onQuantityChange(item, Math.max(0, quantity - 1))}
                    >
                      <Minus aria-hidden="true" />
                    </button>
                    <output aria-live="polite">{quantity}</output>
                    <button
                      type="button"
                      disabled={disabled || quantity >= 999}
                      aria-label={translate(locale, 'increaseQuantity', {
                        name: item.name,
                      })}
                      onClick={() => onQuantityChange(item, quantity + 1)}
                    >
                      <Plus aria-hidden="true" />
                    </button>
                    {busy ? (
                      <span className="sr-only">
                        {translate(locale, 'savingChange')}
                      </span>
                    ) : null}
                  </div>
                )}
              </article>
            );
          })}
        </div>
        <footer className="guest-order-total">
          <span>{translate(locale, 'personalSubtotal')}</span>
          <strong>
            {formatSessionInviteMoney(
              view.personalSubtotalMinor,
              view.preview,
              locale,
            )}
          </strong>
        </footer>
      </section>

      <section className="session-invite-response-card stack">
        <div className="session-invite-response-actions">
          <button
            type="button"
            className="button"
            disabled={!contributionOpen || responseBusy}
            onClick={() => onResponseChange('done')}
          >
            {translate(locale, 'markDone')}
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={!contributionOpen || responseBusy}
            onClick={() => onResponseChange('skipped')}
          >
            {translate(locale, 'skipOrder')}
          </button>
        </div>
      </section>

      <section className="session-invite-account-card stack">
        <div className="stack-xs">
          <h2>{translate(locale, 'createAccount')}</h2>
          <p className="muted">{translate(locale, 'accountBenefit')}</p>
        </div>
        {authenticated ? (
          <button
            type="button"
            className="button secondary"
            disabled={linking}
            onClick={onLinkAccount}
          >
            {translate(locale, linking ? 'linkingAccount' : 'linkAccount')}
          </button>
        ) : (
          <div className="session-invite-account-links">
            <Link to={loginPath}>{translate(locale, 'signIn')}</Link>
            <Link to={registerPath}>{translate(locale, 'register')}</Link>
          </div>
        )}
      </section>
    </div>
  );
}
