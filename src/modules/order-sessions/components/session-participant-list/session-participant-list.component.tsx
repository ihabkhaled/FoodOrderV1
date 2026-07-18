import type { Locale, SessionParticipant } from '@/modules/data-access';

import { participantResponseMessageKey } from '../../helpers/order-session-view.helper';
import type { OrderSessionMessageKey } from '../../i18n/order-session-messages.constants';

interface SessionParticipantListProps {
  participants: readonly SessionParticipant[];
  locale: Locale;
  translate: (
    locale: Locale,
    key: OrderSessionMessageKey,
  ) => string;
}

export function SessionParticipantList({
  participants,
  locale,
  translate,
}: SessionParticipantListProps) {
  return (
    <section className="section-card stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{translate(locale, 'responseProgress')}</p>
          <h2>{translate(locale, 'participants')}</h2>
        </div>
        <span className="session-count-badge">{participants.length}</span>
      </div>
      <ul className="participant-list plain">
        {participants.map((participant) => (
          <li className="participant-row" key={participant.userId}>
            <span className="participant-identity stack-xs">
              <strong>{participant.displayName}</strong>
              <small className="muted">
                {translate(locale, participant.role)}
              </small>
            </span>
            <span
              className={`participant-response participant-response-${participant.response}`}
            >
              {translate(
                locale,
                participantResponseMessageKey(participant.response),
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
