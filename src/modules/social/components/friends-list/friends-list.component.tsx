import type { SocialUser } from '@/modules/data-access';
import { UserMinus, Users } from '@/packages/icons';
import { EmptyState } from '@/shared/ui';

import { initials } from '../../helpers/initials.helper';
import type { SocialMessageKey } from '../../i18n/social-messages.constants';

interface FriendsListProps {
  s: (key: SocialMessageKey) => string;
  friends: SocialUser[];
  onUnfriend: (friendUserId: string) => void;
}

export function FriendsList({ s, friends, onUnfriend }: FriendsListProps) {
  return (
    <section className="section-card stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{s('friends')}</p>
          <h2>{s('friends')}</h2>
        </div>
      </div>
      {friends.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={s('noFriends')}
          description={s('socialIntro')}
        />
      ) : (
        <div className="social-card-grid">
          {friends.map((friend) => (
            <article className="friend-card" key={friend.userId}>
              <div className="friend-card-head">
                <span className="social-avatar">{initials(friend.displayName)}</span>
                <div>
                  <strong>{friend.displayName}</strong>
                  <span className="muted">{friend.email}</span>
                </div>
              </div>
              <button
                className="button secondary danger-ghost"
                aria-label={`${s('unfriend')} ${friend.displayName}`}
                onClick={() => {
                  onUnfriend(friend.userId);
                }}
              >
                <UserMinus />
                {s('unfriend')}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
