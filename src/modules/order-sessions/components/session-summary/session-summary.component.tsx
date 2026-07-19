import type { Locale, OrderSession } from '@/modules/data-access';

import {
  formatSessionDateTime,
  formatSessionMoney,
  sessionStatusMessageKey,
} from '../../helpers/order-session-view.helper';
import type { OrderSessionMessageKey } from '../../i18n/order-session-messages.constants';
import { SessionStatusBadge } from '../session-status-badge/session-status-badge.component';

interface SessionSummaryProps {
  session: OrderSession;
  locale: Locale;
  translate: (
    locale: Locale,
    key: OrderSessionMessageKey,
    parameters?: Readonly<Record<string, string | number>>,
  ) => string;
}

export function SessionSummary({
  session,
  locale,
  translate,
}: SessionSummaryProps) {
  const responded =
    session.responseSummary.done + session.responseSummary.skipped;

  return (
    <section className="session-hero section-card stack">
      <div className="session-hero-heading">
        <div className="stack-xs">
          <p className="eyebrow">
            {translate(locale, 'organizerCommandCenter')}
          </p>
          <h1>{session.title}</h1>
          <p className="muted">
            {session.deadlineAt
              ? translate(locale, 'remainingTime', {
                  time: formatSessionDateTime(session.deadlineAt, locale),
                })
              : translate(locale, 'noDeadline')}
          </p>
        </div>
        <SessionStatusBadge
          status={session.status}
          label={translate(locale, sessionStatusMessageKey(session.status))}
        />
      </div>
      <dl className="session-metric-grid">
        <div>
          <dt>{translate(locale, 'responseProgress')}</dt>
          <dd>
            {translate(locale, 'responsesComplete', {
              done: responded,
              total: session.responseSummary.total,
            })}
          </dd>
        </div>
        <div>
          <dt>{translate(locale, 'expectedTotal')}</dt>
          <dd>
            {formatSessionMoney(
              session.settlementSummary.expectedGrandTotalMinor,
              session.currency,
              locale,
            )}
          </dd>
        </div>
        <div>
          <dt>{translate(locale, 'outstanding')}</dt>
          <dd>
            {formatSessionMoney(
              session.settlementSummary.outstandingGrandTotalMinor,
              session.currency,
              locale,
            )}
          </dd>
        </div>
        <div>
          <dt>{translate(locale, 'readyToFinalize')}</dt>
          <dd>{session.responseSummary.eligibleForFinalization}</dd>
        </div>
      </dl>
    </section>
  );
}
