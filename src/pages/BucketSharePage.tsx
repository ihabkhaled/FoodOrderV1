import { ArrowLeft, Check, Copy, Share2, ShieldOff, UserMinus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ActivityTimeline } from '@/components/ActivityTimeline';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorState } from '@/components/ErrorState';
import { Loading } from '@/components/Loading';
import type { MessageKey } from '@/i18n/messages';
import { formatDateTime } from '@/lib/date';
import { ASSIGNABLE_ROLES } from '@/lib/sharing';
import { sharingService } from '@/services';
import type { SharedBucketView } from '@/services/contracts';
import { copyToClipboard, shareText } from '@/services/platform';
import { useApp } from '@/state/AppContext';
import type { BucketActivityEvent, BucketInvite, BucketMember, BucketRole, InviteStatus } from '@/types/domain';

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

export function BucketSharePage() {
  const { bucketId } = useParams();
  const { user, locale, t, showToast } = useApp();
  const [view, setView] = useState<SharedBucketView | null>(null);
  const [invites, setInvites] = useState<BucketInvite[]>([]);
  const [activity, setActivity] = useState<BucketActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteRole, setInviteRole] = useState<Exclude<BucketRole, 'owner'>>('contributor');
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [removing, setRemoving] = useState<BucketMember | null>(null);
  const [enabling, setEnabling] = useState(false);

  const load = useCallback(async () => {
    if (!user || !bucketId) return;
    try {
      setError('');
      const nextView = await sharingService.getSharedBucketView(user, bucketId);
      if (!nextView) throw new Error(t('notAllowed'));
      if (nextView.myRole !== 'owner') throw new Error(t('onlyOwnerCanManage'));
      setView(nextView);
      if (nextView.bucket.visibility === 'shared') {
        const [nextInvites, nextActivity] = await Promise.all([
          sharingService.listInvites(user, bucketId),
          sharingService.listActivity(user, bucketId).catch(() => []),
        ]);
        setInvites(nextInvites);
        setActivity(nextActivity);
      }
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('tryAgain'));
    } finally {
      setLoading(false);
    }
  }, [user, bucketId, t]);

  useEffect(() => { void load(); }, [load]);

  const enable = async (): Promise<void> => {
    if (!user || !bucketId) return;
    try {
      setEnabling(true);
      await sharingService.enableSharing(user, bucketId);
      showToast(t('sharingEnabled'), 'success');
      await load();
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    } finally {
      setEnabling(false);
    }
  };

  const createInvite = async (): Promise<void> => {
    if (!user || !bucketId) return;
    try {
      setCreating(true);
      setCopiedCode(false);
      const result = await sharingService.createInvite(user, bucketId, inviteRole);
      setJoinCode(result.joinCode);
      setInvites((current) => [result.invite, ...current]);
      showToast(t('inviteCreated'), 'success');
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const shareOrCopy = async (): Promise<void> => {
    if (!joinCode) return;
    const shared = await shareText(t('joinBucket'), joinCode);
    if (!shared) {
      await copyToClipboard(joinCode);
      showToast(t('copied'), 'success');
    }
    setCopiedCode(true);
  };

  const revokeInvite = async (inviteId: string): Promise<void> => {
    if (!user || !bucketId) return;
    try {
      await sharingService.revokeInvite(user, bucketId, inviteId);
      setInvites((current) =>
        current.map((invite) =>
          invite.id === inviteId ? { ...invite, status: 'revoked' as const } : invite,
        ),
      );
      showToast(t('inviteRevoked'), 'success');
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    }
  };

  const changeRole = async (member: BucketMember, role: Exclude<BucketRole, 'owner'>): Promise<void> => {
    if (!user || !bucketId) return;
    try {
      const saved = await sharingService.changeMemberRole(user, bucketId, member.userId, role);
      setView((current) =>
        current
          ? {
              ...current,
              members: current.members.map((item) => (item.userId === member.userId ? saved : item)),
            }
          : current,
      );
      showToast(t('roleChanged'), 'success');
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    }
  };

  const removeMember = async (): Promise<void> => {
    if (!user || !bucketId || !removing) return;
    try {
      await sharingService.revokeMember(user, bucketId, removing.userId);
      setView((current) =>
        current
          ? { ...current, members: current.members.filter((item) => item.userId !== removing.userId) }
          : current,
      );
      showToast(t('memberRemoved'), 'success');
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    } finally {
      setRemoving(null);
    }
  };

  if (loading) return <Loading />;
  if (error || !view) return <ErrorState message={error || t('notAllowed')} onRetry={() => void load()} />;

  const { bucket, members } = view;

  return (
    <div className="page narrow stack-lg">
      <Link className="back-link" to={`/buckets/${bucket.id}/collaborate`}><ArrowLeft />{t('back')}</Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">{t('sharing')}</p>
          <h1>{bucket.title}</h1>
        </div>
      </header>

      {bucket.visibility === 'shared' ? (
        <>
          <section className="section-card stack">
            <div className="section-heading">
              <div><p className="eyebrow">{t('invites')}</p><h2>{t('createInvite')}</h2></div>
            </div>
            <div className="invite-create">
              <label>
                {t('role')}
                <select
                  value={inviteRole}
                  onChange={(event) => { setInviteRole(event.target.value as Exclude<BucketRole, 'owner'>); }}
                >
                  {ASSIGNABLE_ROLES.map((role) => (
                    <option key={role} value={role}>{t(ROLE_LABEL[role])}</option>
                  ))}
                </select>
              </label>
              <button className="button" disabled={creating} onClick={() => void createInvite()}>
                <Share2 />{creating ? t('loading') : t('createInvite')}
              </button>
            </div>
            {joinCode ? (
              <div className="join-code-box" role="status">
                <p className="muted">{t('codeShownOnce')}</p>
                <code className="join-code">{joinCode}</code>
                <button className="button secondary" onClick={() => void shareOrCopy()}>
                  {copiedCode ? <Check /> : <Copy />}{t('copy')}
                </button>
              </div>
            ) : null}
            {invites.length > 0 ? (
              <ul className="list plain">
                {invites.map((invite) => (
                  <li className="list-row" key={invite.id}>
                    <div>
                      <strong>{t(ROLE_LABEL[invite.role])}</strong>
                      <span className="muted">
                        {t(INVITE_STATUS_LABEL[invite.status])} · {t('expiresIn')} {formatDateTime(invite.expiresAt, locale)}
                      </span>
                    </div>
                    {invite.status === 'pending' ? (
                      <button className="icon-button danger-ghost" aria-label={t('revoke')} onClick={() => void revokeInvite(invite.id)}>
                        <ShieldOff />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="section-card stack">
            <div className="section-heading">
              <div><p className="eyebrow">{t('members')}</p><h2><Users size={18} aria-hidden="true" /> {members.length}</h2></div>
            </div>
            <ul className="list plain">
              {members.map((member) => (
                <li className="list-row" key={member.userId}>
                  <div>
                    <strong>
                      {member.displayName}
                      {member.userId === user?.id ? ` (${t('you')})` : ''}
                    </strong>
                    <span className="muted">{member.email}</span>
                  </div>
                  {member.role === 'owner' ? (
                    <span className="mode-pill">{t('roleOwner')}</span>
                  ) : (
                    <div className="row-actions">
                      <select
                        aria-label={`${t('role')} — ${member.displayName}`}
                        value={member.role}
                        onChange={(event) => void changeRole(member, event.target.value as Exclude<BucketRole, 'owner'>)}
                      >
                        {ASSIGNABLE_ROLES.map((role) => (
                          <option key={role} value={role}>{t(ROLE_LABEL[role])}</option>
                        ))}
                      </select>
                      <button className="icon-button danger-ghost" aria-label={`${t('removeMember')} — ${member.displayName}`} onClick={() => { setRemoving(member); }}>
                        <UserMinus />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="section-card">
            <div className="section-heading"><div><p className="eyebrow">{t('activity')}</p><h2>{t('activity')}</h2></div></div>
            <ActivityTimeline events={activity} />
          </section>
        </>
      ) : (
        <section className="section-card stack">
          <p>{t('sharingDisabledHint')}</p>
          <button className="button" disabled={enabling} onClick={() => void enable()}>
            <Share2 />{enabling ? t('loading') : t('enableSharing')}
          </button>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title={t('removeMember')}
        message={t('confirmRemoveMember')}
        confirmLabel={t('removeMember')}
        cancelLabel={t('cancel')}
        danger
        onConfirm={() => void removeMember()}
        onCancel={() => { setRemoving(null); }}
      />
    </div>
  );
}
