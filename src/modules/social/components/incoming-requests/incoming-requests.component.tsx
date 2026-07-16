import type { SocialOverview } from '@/modules/data-access';
import { Check, X } from '@/packages/icons';

import { initials } from '../../helpers/initials.helper';
import type { SocialMessageKey } from '../../i18n/social-messages.constants';

interface IncomingRequestsProps {
  s: (key: SocialMessageKey) => string;
  requests: SocialOverview['incomingRequests'];
  onRespond: (senderUserId: string, response: 'accepted' | 'declined') => void;
}

export function IncomingRequests({
  s,
  requests,
  onRespond,
}: IncomingRequestsProps) {
  return (
    <section className="section-card stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{s('incomingRequests')}</p>
          <h2>{s('incomingRequests')}</h2>
        </div>
      </div>
      {requests.length === 0 ? (
        <p className="muted">{s('noRequests')}</p>
      ) : (
        requests.map((request) => (
          <article className="list-row" key={request.id}>
            <div className="social-person">
              <span className="social-avatar">
                {initials(request.sender.displayName)}
              </span>
              <div>
                <strong>{request.sender.displayName}</strong>
                <span className="muted">{request.sender.email}</span>
              </div>
            </div>
            <div className="row-actions">
              <button
                className="button success"
                onClick={() => {
                  onRespond(request.sender.userId, 'accepted');
                }}
              >
                <Check />
                {s('accept')}
              </button>
              <button
                className="button danger"
                onClick={() => {
                  onRespond(request.sender.userId, 'declined');
                }}
              >
                <X />
                {s('decline')}
              </button>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
