import type { Locale } from '@/modules/data-access';

import type { SessionLifecycleAction } from '../../hooks/use-session-command-center.hook';
import type { OrderSessionMessageKey } from '../../i18n/order-session-messages.constants';

interface SessionActionPanelProps {
  locale: Locale;
  isOrganizer: boolean;
  canRespond: boolean;
  busy: boolean;
  actions: readonly SessionLifecycleAction[];
  translate: (
    locale: Locale,
    key: OrderSessionMessageKey,
  ) => string;
  onDone: () => void;
  onSkip: () => void;
  onLifecycleAction: (action: SessionLifecycleAction) => void;
}

export function SessionActionPanel({
  locale,
  isOrganizer,
  canRespond,
  busy,
  actions,
  translate,
  onDone,
  onSkip,
  onLifecycleAction,
}: SessionActionPanelProps) {
  return (
    <section className="section-card stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            {isOrganizer
              ? translate(locale, 'organizerCommandCenter')
              : translate(locale, 'myOrder')}
          </p>
          <h2>{translate(locale, 'status')}</h2>
        </div>
      </div>
      {canRespond ? (
        <div className="session-action-grid">
          <button
            type="button"
            className="button success"
            disabled={busy}
            onClick={onDone}
          >
            {translate(locale, 'markDone')}
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onSkip}
          >
            {translate(locale, 'skipThisOrder')}
          </button>
        </div>
      ) : null}
      {isOrganizer && actions.length > 0 ? (
        <div className="session-action-grid organizer-actions">
          {actions.map((action) => (
            <button
              type="button"
              key={action.status}
              className={`button${action.danger ? ' danger' : ' secondary'}`}
              disabled={busy}
              onClick={() => {
                onLifecycleAction(action);
              }}
            >
              {translate(locale, action.labelKey)}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
