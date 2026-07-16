import type { Locale } from '@/modules/data-access';

import { BucketSocialSharePanelView } from './bucket-social-share-panel.component';
import { useBucketSocialSharePanel } from './use-bucket-social-share-panel.hook';

interface BucketSocialSharePanelProps {
  bucketId: string;
  locale: Locale;
  disabled: boolean;
  onSuccess: (message: string) => void;
  onError: (error: unknown) => void;
}

export function BucketSocialSharePanel({
  bucketId,
  locale,
  disabled,
  onSuccess,
  onError,
}: BucketSocialSharePanelProps) {
  const vm = useBucketSocialSharePanel({ bucketId, locale, onSuccess, onError });

  if (!vm.overview) return null;

  return (
    <BucketSocialSharePanelView
      s={vm.s}
      overview={vm.overview}
      grants={vm.grants}
      disabled={disabled}
      saving={vm.saving}
      friendId={vm.friendId}
      groupId={vm.groupId}
      role={vm.role}
      onFriendIdChange={vm.setFriendId}
      onGroupIdChange={vm.setGroupId}
      onRoleChange={vm.setRole}
      onShareWithFriend={() => void vm.shareWithFriend()}
      onShareWithGroup={() => void vm.shareWithGroup()}
    />
  );
}
