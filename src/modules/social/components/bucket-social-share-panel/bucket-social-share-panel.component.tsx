import type {
  BucketAccessGrant,
  BucketRole,
  SocialOverview,
} from '@/modules/data-access';
import { Share2, Users } from '@/packages/icons';

import type { SocialMessageKey } from '../../i18n/social-messages.constants';

interface BucketSocialSharePanelViewProps {
  s: (key: SocialMessageKey) => string;
  overview: SocialOverview;
  grants: BucketAccessGrant[];
  disabled: boolean;
  saving: boolean;
  friendId: string;
  groupId: string;
  role: Exclude<BucketRole, 'owner'>;
  onFriendIdChange: (value: string) => void;
  onGroupIdChange: (value: string) => void;
  onRoleChange: (value: Exclude<BucketRole, 'owner'>) => void;
  onShareWithFriend: () => void;
  onShareWithGroup: () => void;
}

export function BucketSocialSharePanelView({
  s,
  overview,
  grants,
  disabled,
  saving,
  friendId,
  groupId,
  role,
  onFriendIdChange,
  onGroupIdChange,
  onRoleChange,
  onShareWithFriend,
  onShareWithGroup,
}: BucketSocialSharePanelViewProps) {
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
            onRoleChange(event.target.value as Exclude<BucketRole, 'owner'>);
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
            onFriendIdChange(event.target.value);
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
          onClick={onShareWithFriend}
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
            onGroupIdChange(event.target.value);
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
          onClick={onShareWithGroup}
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
