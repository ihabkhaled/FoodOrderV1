import type {
  BucketInvite,
  BucketRole,
  InviteStatus,
  Locale,
} from '@/modules/data-access';
import { ASSIGNABLE_ROLES } from '@/modules/data-access';
import { Check, Copy, Share2, ShieldOff } from '@/packages/icons';
import { formatDateTime } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';

const ROLE_LABEL: Record<BucketRole, MessageKey> = {
  owner: 'roleOwner',
  editor: 'roleEditor',
  contributor: 'roleContributor',
  viewer: 'roleViewer',
};

const INVITE_STATUS_LABEL: Record<InviteStatus, MessageKey> = {
  pending: 'pending',
  accepted: 'accepted',
  revoked: 'revoked',
  expired: 'expired',
};

interface BucketInvitePanelProps {
  locale: Locale;
  invites: BucketInvite[];
  inviteRole: Exclude<BucketRole, 'owner'>;
  creating: boolean;
  joinCode: string;
  copiedCode: boolean;
  translate: (key: MessageKey) => string;
  onRoleChange: (role: Exclude<BucketRole, 'owner'>) => void;
  onCreate: () => void;
  onShare: () => void;
  onRevoke: (inviteId: string) => void;
}

export function BucketInvitePanel({
  locale,
  invites,
  inviteRole,
  creating,
  joinCode,
  copiedCode,
  translate,
  onRoleChange,
  onCreate,
  onShare,
  onRevoke,
}: BucketInvitePanelProps) {
  return (
    <section className="section-card stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{translate('invites')}</p>
          <h2>{translate('createInvite')}</h2>
        </div>
      </div>
      <div className="invite-create">
        <label>
          {translate('role')}
          <select
            value={inviteRole}
            onChange={(event) => {
              onRoleChange(event.target.value as Exclude<BucketRole, 'owner'>);
            }}
          >
            {ASSIGNABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {translate(ROLE_LABEL[role])}
              </option>
            ))}
          </select>
        </label>
        <button className="button" disabled={creating} onClick={onCreate}>
          <Share2 />
          {creating ? translate('loading') : translate('createInvite')}
        </button>
      </div>
      {joinCode ? (
        <div className="join-code-box" role="status">
          <p className="muted">{translate('codeShownOnce')}</p>
          <code className="join-code">{joinCode}</code>
          <button className="button secondary" onClick={onShare}>
            {copiedCode ? <Check /> : <Copy />}
            {translate('copy')}
          </button>
        </div>
      ) : null}
      {invites.length > 0 ? (
        <ul className="list plain">
          {invites.map((invite) => (
            <li className="list-row" key={invite.id}>
              <div>
                <strong>{translate(ROLE_LABEL[invite.role])}</strong>
                <span className="muted">
                  {translate(INVITE_STATUS_LABEL[invite.status])} ·{' '}
                  {translate('expiresIn')}{' '}
                  {formatDateTime(invite.expiresAt, locale)}
                </span>
              </div>
              {invite.status === 'pending' ? (
                <button
                  className="icon-button danger-ghost"
                  aria-label={translate('revoke')}
                  onClick={() => {
                    onRevoke(invite.id);
                  }}
                >
                  <ShieldOff />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
