import { useEffect, useState } from 'react';

import { translateSocial } from '@/i18n/socialMessages';
import type { BucketAccessGrant, BucketRole, Locale, SocialOverview } from '@/modules/data-access';
import { socialService } from '@/modules/data-access';
import { Share2, Users } from '@/packages/icons';

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
  const s = (key: Parameters<typeof translateSocial>[1]) =>
    translateSocial(locale, key);
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

  if (!overview) return null;

  return (
    <section className="section-card stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{s('shareWithFriends')}</p>
          <h2>{s('shareWithFriends')}</h2>
        </div>
      </div>

      <label>
        Role
        <select
          value={role}
          disabled={disabled || saving}
          onChange={(event) => {
            setRole(event.target.value as Exclude<BucketRole, 'owner'>);
          }}
        >
          <option value="editor">Editor</option>
          <option value="contributor">Contributor</option>
          <option value="viewer">Viewer</option>
        </select>
      </label>

      <div className="row-actions">
        <select
          aria-label={s('selectFriend')}
          value={friendId}
          disabled={disabled || saving}
          onChange={(event) => {
            setFriendId(event.target.value);
          }}
        >
          <option value="">{s('selectFriend')}</option>
          {overview.friends.map((friend) => (
            <option key={friend.userId} value={friend.userId}>
              {friend.displayName}
            </option>
          ))}
        </select>
        <button
          className="button secondary"
          disabled={disabled || saving || !friendId}
          onClick={() =>
            void share(() =>
              socialService.shareBucketWithUser(bucketId, friendId, role),
            )
          }
        >
          <Share2 />
          {s('shareWithUser')}
        </button>
      </div>

      <div className="row-actions">
        <select
          aria-label={s('selectGroup')}
          value={groupId}
          disabled={disabled || saving}
          onChange={(event) => {
            setGroupId(event.target.value);
          }}
        >
          <option value="">{s('selectGroup')}</option>
          {overview.groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <button
          className="button secondary"
          disabled={disabled || saving || !groupId}
          onClick={() =>
            void share(() =>
              socialService.shareBucketWithGroup(bucketId, groupId, role),
            )
          }
        >
          <Users />
          {s('shareWithGroup')}
        </button>
      </div>

      {grants.length > 0 ? (
        <div className="stack">
          <strong>{s('accessGrants')}</strong>
          {grants.map((grant) => (
            <div className="list-row" key={grant.id}>
              <span>{grant.subjectName}</span>
              <span className="muted">
                {grant.subjectType} · {grant.role}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
