import type { InviteLinkPreview } from '@/modules/data-access';
import type { MessageKey } from '@/shared/i18n';

export interface InviteLinkPreviewCardProps {
  preview: InviteLinkPreview;
  redeeming: boolean;
  onAccept: () => void;
  t: (key: MessageKey) => string;
}

const headingKey = (kind: InviteLinkPreview['kind']): MessageKey =>
  kind === 'bucket'
    ? 'inviteLinkBucketHeading'
    : kind === 'group'
      ? 'inviteLinkGroupHeading'
      : 'inviteLinkFriendHeading';

const ROLE_LABEL_KEYS = {
  editor: 'roleEditor',
  contributor: 'roleContributor',
  viewer: 'roleViewer',
} as const satisfies Record<string, MessageKey>;

const actionKey = (kind: InviteLinkPreview['kind']): MessageKey =>
  kind === 'bucket'
    ? 'inviteLinkJoinBucket'
    : kind === 'group'
      ? 'inviteLinkJoinGroup'
      : 'inviteLinkAddFriend';

/** Says exactly what accepting will grant, before anything is written. */
export function InviteLinkPreviewCard({
  preview,
  redeeming,
  onAccept,
  t,
}: InviteLinkPreviewCardProps) {
  const subject = preview.bucketTitle ?? preview.groupName ?? preview.createdByName;

  return (
    <section className="card stack-md invite-link-card">
      <p className="eyebrow">{t('inviteLinkEyebrow')}</p>
      <h1>{t(headingKey(preview.kind))}</h1>
      <p className="invite-link-subject">{subject}</p>
      <p className="muted">
        {t('inviteLinkSharedBy')} {preview.createdByName}
      </p>
      {preview.role ? (
        <p className="muted">
          {t('inviteLinkRole')}: {t(ROLE_LABEL_KEYS[preview.role])}
        </p>
      ) : null}
      <button
        type="button"
        className="primary"
        onClick={onAccept}
        disabled={redeeming}
        aria-busy={redeeming}
      >
        {redeeming ? t('loading') : t(actionKey(preview.kind))}
      </button>
    </section>
  );
}
