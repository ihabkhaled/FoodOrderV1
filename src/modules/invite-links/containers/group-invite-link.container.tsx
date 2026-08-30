import { useApp } from '@/modules/session';

import { InviteLinkShareCard } from '../components/invite-link-panel/invite-link-share-card.component';
import { useInviteLinkSharing } from '../hooks/use-invite-link-sharing.hook';

export interface GroupInviteLinkContainerProps {
  groupId: string;
  groupName: string;
}

/** A link that puts whoever opens it straight into the group. */
export function GroupInviteLinkContainer({
  groupId,
  groupName,
}: GroupInviteLinkContainerProps) {
  const { t, locale } = useApp();
  const sharing = useInviteLinkSharing({ kind: 'group', groupId }, groupName);

  return (
    <InviteLinkShareCard
      locale={locale}
      title={t('inviteLinkGroupTitle')}
      description={t('inviteLinkGroupDescription')}
      actionLabel={t('inviteLinkGroupAction')}
      link={sharing.link}
      creating={sharing.creating}
      sharing={sharing.sharing}
      copied={sharing.copied}
      onCreate={() => void sharing.create()}
      onShare={() => void sharing.share()}
      t={t}
    />
  );
}
