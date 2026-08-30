import { useApp } from '@/modules/session';

import { InviteLinkShareCard } from '../components/invite-link-panel/invite-link-share-card.component';
import { useInviteLinkSharing } from '../hooks/use-invite-link-sharing.hook';

/**
 * A link other people use to add the sharer as a friend.
 *
 * Sharing it is the consent, so nobody has to approve each person afterwards;
 * the copy says so plainly, because a link that adds strangers silently would
 * be a surprise.
 */
export function FriendInviteLinkContainer() {
  const { t, locale } = useApp();
  const sharing = useInviteLinkSharing({ kind: 'friend' }, t('inviteLinkFriendTitle'));

  return (
    <InviteLinkShareCard
      locale={locale}
      title={t('inviteLinkFriendTitle')}
      description={t('inviteLinkFriendDescription')}
      actionLabel={t('inviteLinkFriendAction')}
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
