import type { SocialOverview } from '@/modules/data-access';
import { Check, X } from '@/packages/icons';

import type { SocialMessageKey } from '../../i18n/social-messages.constants';

interface GroupInvitationsProps {
  s: (key: SocialMessageKey) => string;
  invitations: SocialOverview['groupInvitations'];
  onRespond: (groupId: string, response: 'active' | 'declined') => void;
}

export function GroupInvitations({
  s,
  invitations,
  onRespond,
}: GroupInvitationsProps) {
  return (
    <section className="section-card stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{s('groupInvitations')}</p>
          <h2>{s('groupInvitations')}</h2>
        </div>
      </div>
      {invitations.length === 0 ? (
        <p className="muted">{s('noRequests')}</p>
      ) : (
        invitations.map((invitation) => (
          <article className="list-row" key={invitation.groupId}>
            <div>
              <strong>{invitation.groupName}</strong>
              <span className="muted">{invitation.owner.displayName}</span>
            </div>
            <div className="row-actions">
              <button
                className="button success"
                onClick={() => {
                  onRespond(invitation.groupId, 'active');
                }}
              >
                <Check />
                {s('accept')}
              </button>
              <button
                className="button danger"
                onClick={() => {
                  onRespond(invitation.groupId, 'declined');
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
