import { useEffect, useState } from 'react';

import type {
  BucketAccessGrant,
  BucketRole,
  Locale,
  SocialOverview,
} from '@/modules/data-access';
import { socialService } from '@/modules/data-access';

import type { SocialMessageKey } from '../../i18n/social-messages.constants';
import { translateSocial } from '../../i18n/translate-social.helper';

interface BucketSocialSharePanelInput {
  bucketId: string;
  locale: Locale;
  onSuccess: (message: string) => void;
  onError: (error: unknown) => void;
}

export interface BucketSocialSharePanelViewModel {
  s: (key: SocialMessageKey) => string;
  overview: SocialOverview | null;
  grants: BucketAccessGrant[];
  friendId: string;
  setFriendId: (value: string) => void;
  groupId: string;
  setGroupId: (value: string) => void;
  role: Exclude<BucketRole, 'owner'>;
  setRole: (value: Exclude<BucketRole, 'owner'>) => void;
  saving: boolean;
  shareWithFriend: () => Promise<void>;
  shareWithGroup: () => Promise<void>;
}

export function useBucketSocialSharePanel({
  bucketId,
  locale,
  onSuccess,
  onError,
}: BucketSocialSharePanelInput): BucketSocialSharePanelViewModel {
  const s = (key: SocialMessageKey) => translateSocial(locale, key);
  const [overview, setOverview] = useState<SocialOverview | null>(null);
  const [grants, setGrants] = useState<BucketAccessGrant[]>([]);
  const [friendId, setFriendId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [role, setRole] =
    useState<Exclude<BucketRole, 'owner'>>('contributor');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([
      socialService.getOverview(),
      socialService.listBucketAccessGrants(bucketId),
    ])
      .then(([nextOverview, nextGrants]) => {
        setOverview(nextOverview);
        setGrants(nextGrants);
      })
      .catch(onError);
  }, [bucketId, onError]);

  const share = async (action: () => Promise<BucketAccessGrant>) => {
    try {
      setSaving(true);
      const saved = await action();
      setGrants((current) => [
        ...current.filter((grant) => grant.id !== saved.id),
        saved,
      ]);
      onSuccess(s('sharedSuccessfully'));
    } catch (error) {
      onError(error);
    } finally {
      setSaving(false);
    }
  };

  const shareWithFriend = async (): Promise<void> => {
    await share(() =>
      socialService.shareBucketWithUser(bucketId, friendId, role),
    );
  };

  const shareWithGroup = async (): Promise<void> => {
    await share(() =>
      socialService.shareBucketWithGroup(bucketId, groupId, role),
    );
  };

  return {
    s,
    overview,
    grants,
    friendId,
    setFriendId,
    groupId,
    setGroupId,
    role,
    setRole,
    saving,
    shareWithFriend,
    shareWithGroup,
  };
}
