import { useApp } from '@/modules/session';

import { InviteLinkShareCard } from '../components/invite-link-panel/invite-link-share-card.component';
import { useInviteLinkSharing } from '../hooks/use-invite-link-sharing.hook';

export interface BucketInviteLinkContainerProps {
  bucketId: string;
  bucketTitle: string;
}

/**
 * Bucket share link, alongside the existing single-use join code.
 *
 * The join code stays: it is short enough to read aloud. This is the version
 * that survives being pasted into a group chat.
 */
export function BucketInviteLinkContainer({
  bucketId,
  bucketTitle,
}: BucketInviteLinkContainerProps) {
  const { t, locale } = useApp();
  const sharing = useInviteLinkSharing({ kind: 'bucket', bucketId }, bucketTitle);

  return (
    <InviteLinkShareCard
      locale={locale}
      title={t('inviteLinkBucketTitle')}
      description={t('inviteLinkBucketDescription')}
      actionLabel={t('inviteLinkBucketAction')}
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
