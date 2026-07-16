import type { BucketInvitation } from '@/modules/data-access';
import { Check, X } from '@/packages/icons';
import type { MessageKey } from '@/shared/i18n';

import type { SocialMessageKey } from '../../i18n/social-messages.constants';

const bucketRoleMessage: Record<
  BucketInvitation['role'],
  'roleEditor' | 'roleContributor' | 'roleViewer'
> = {
  editor: 'roleEditor',
  contributor: 'roleContributor',
  viewer: 'roleViewer',
};

interface BucketInvitationsProps {
  s: (key: SocialMessageKey) => string;
  t: (key: MessageKey) => string;
  invitations: BucketInvitation[];
  onRespond: (bucketId: string, response: 'accepted' | 'declined') => void;
}

export function BucketInvitations({
  s,
  t,
  invitations,
  onRespond,
}: BucketInvitationsProps) {
  return (
    <section className="section-card stack" id="bucket-invitations">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{s('bucketInvitations')}</p>
          <h2>{s('bucketInvitations')}</h2>
        </div>
      </div>
      {invitations.length === 0 ? (
        <p className="muted">{s('noRequests')}</p>
      ) : (
        invitations.map((invitation) => (
          <article className="list-row" key={invitation.id}>
            <div>
              <strong>{invitation.bucketTitle}</strong>
              <span className="muted">
                {s('invitedBy')} {invitation.owner.displayName} ·{' '}
                {t(bucketRoleMessage[invitation.role])}
              </span>
            </div>
            <div className="row-actions">
              <button
                className="button success"
                onClick={() => {
                  onRespond(invitation.bucketId, 'accepted');
                }}
              >
                <Check />
                {s('accept')}
              </button>
              <button
                className="button danger"
                onClick={() => {
                  onRespond(invitation.bucketId, 'declined');
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
