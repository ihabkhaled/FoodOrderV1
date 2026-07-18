import type { Locale, OrderSession } from '@/modules/data-access';
import { Link } from '@/packages/router';

import {
  formatSessionDateTime,
  formatSessionMoney,
  sessionStatusMessageKey,
} from '../../helpers/order-session-view.helper';
import type { OrderSessionMessageKey } from '../../i18n/order-session-messages.constants';
import { buildOrderSessionDetailsRoute } from '../../routes/order-sessions-route-paths.constants';
import { SessionStatusBadge } from '../session-status-badge/session-status-badge.component';

interface OrderSessionListProps {
  sessions: readonly OrderSession[];
  locale: Locale;
  translate: (
    locale: Locale,
    key: OrderSessionMessageKey,
    parameters?: Readonly<Record<string, string | number>>,
  ) => string;
}

export function OrderSessionList({
  sessions,
  locale,
  translate,
}: OrderSessionListProps) {
  return (
    <ul className="session-card-list plain" aria-label={translate(locale, 'activeOrders')}>
      {sessions.map((session) => (
        <li key={session.id}>
          <Link
            className="session-card"
            to={buildOrderSessionDetailsRoute(session.id)}
          >
            <span className="session-card-heading">
              <span className="stack-xs">
                <strong>{session.title}</strong>
                <span className="muted">
                  {session.deadlineAt
                    ? translate(locale, 'remainingTime', {
                        time: formatSessionDateTime(session.deadlineAt, locale),
                      })
                    : translate(locale, 'noDeadline')}
                </span>
              </span>
              <SessionStatusBadge
                status={session.status}
                label={translate(locale, sessionStatusMessageKey(session.status))}
              />
            </span>
            <span className="session-card-metrics">
              <span>
                <strong>{session.responseSummary.total}</strong>
                <small>{translate(locale, 'participants')}</small>
              </span>
              <span>
                <strong>
                  {session.responseSummary.done + session.responseSummary.skipped}
                </strong>
                <small>{translate(locale, 'readyToFinalize')}</small>
              </span>
              <span>
                <strong>
                  {formatSessionMoney(
                    session.settlementSummary.expectedGrandTotalMinor,
                    session.currency,
                    locale,
                  )}
                </strong>
                <small>{translate(locale, 'expectedTotal')}</small>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
