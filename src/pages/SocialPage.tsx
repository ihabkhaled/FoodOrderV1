import { Check, Search, UserPlus, Users, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Loading } from '@/components/Loading';
import { translateSocial } from '@/i18n/socialMessages';
import { socialService } from '@/services';
import { useApp } from '@/state/AppContext';
import type {
  FriendGroup,
  SocialOverview,
  SocialUser,
} from '@/types/social';

const emptyOverview = (): SocialOverview => ({
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  groups: [],
  groupInvitations: [],
});

export function SocialPage() {
  const { user, locale, t, showToast } = useApp();
  const s = (key: Parameters<typeof translateSocial>[1]) =>
    translateSocial(locale, key);
  const [overview, setOverview] = useState<SocialOverview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SocialUser | null>(null);
  const [searched, setSearched] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setError('');
      setOverview(await socialService.getOverview());
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('tryAgain'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<void>, message: string) => {
    try {
      await action();
      showToast(message, 'success');
      await load();
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    }
  };

  const search = async () => {
    try {
      setSearching(true);
      setSearched(true);
      setResult(await socialService.searchUserByEmail(email));
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async () => {
    await run(async () => {
      await socialService.sendFriendRequest(email);
      setResult(null);
      setEmail('');
      setSearched(false);
    }, s('requestSent'));
  };

  const createGroup = async () => {
    await run(async () => {
      await socialService.createGroup(groupName, groupDescription);
      setGroupName('');
      setGroupDescription('');
    }, s('groupCreated'));
  };

  const invite = async (group: FriendGroup) => {
    const friendId = selectedFriends[group.id];
    if (!friendId) return;
    await run(
      () => socialService.inviteFriendToGroup(group.id, friendId),
      s('invitationSent'),
    );
  };

  if (loading) return <Loading />;
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setLoading(true);
          void load();
        }}
      />
    );
  }

  return (
    <div className="page stack-lg">
      <header className="page-heading">
        <div>
          <p className="eyebrow">{s('social')}</p>
          <h1>{s('social')}</h1>
          <p className="muted">{s('socialIntro')}</p>
        </div>
      </header>

      <section className="section-card stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{s('findFriend')}</p>
            <h2>{s('findFriend')}</h2>
          </div>
        </div>
        <div className="row-actions">
          <label className="grow">
            {t('email')}
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void search();
              }}
            />
          </label>
          <button
            className="button secondary"
            disabled={searching || !email.trim()}
            onClick={() => void search()}
          >
            <Search />
            {searching ? t('loading') : s('search')}
          </button>
        </div>
        {result ? (
          <article className="list-row">
            <div>
              <strong>{result.displayName}</strong>
              <span className="muted">{result.email}</span>
            </div>
            <button className="button" onClick={() => void sendRequest()}>
              <UserPlus />
              {s('sendFriendRequest')}
            </button>
          </article>
        ) : searched ? (
          <p className="muted">{s('noSearchResult')}</p>
        ) : null}
      </section>

      <section className="section-card stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{s('incomingRequests')}</p>
            <h2>{s('incomingRequests')}</h2>
          </div>
        </div>
        {overview.incomingRequests.length === 0 ? (
          <p className="muted">{s('noRequests')}</p>
        ) : (
          overview.incomingRequests.map((request) => (
            <article className="list-row" key={request.id}>
              <div>
                <strong>{request.sender.displayName}</strong>
                <span className="muted">{request.sender.email}</span>
              </div>
              <div className="row-actions">
                <button
                  className="button success"
                  onClick={() =>
                    void run(
                      () =>
                        socialService.respondFriendRequest(
                          request.sender.userId,
                          'accepted',
                        ),
                      s('accept'),
                    )
                  }
                >
                  <Check />
                  {s('accept')}
                </button>
                <button
                  className="button danger"
                  onClick={() =>
                    void run(
                      () =>
                        socialService.respondFriendRequest(
                          request.sender.userId,
                          'declined',
                        ),
                      s('decline'),
                    )
                  }
                >
                  <X />
                  {s('decline')}
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="section-card stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{s('friends')}</p>
            <h2>{s('friends')}</h2>
          </div>
        </div>
        {overview.friends.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title={s('noFriends')}
            description={s('socialIntro')}
          />
        ) : (
          overview.friends.map((friend) => (
            <article className="list-row" key={friend.userId}>
              <div>
                <strong>{friend.displayName}</strong>
                <span className="muted">{friend.email}</span>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="section-card stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{s('groups')}</p>
            <h2>{s('createGroup')}</h2>
          </div>
        </div>
        <div className="form-grid">
          <label>
            {s('groupName')}
            <input
              maxLength={80}
              value={groupName}
              onChange={(event) => {
                setGroupName(event.target.value);
              }}
            />
          </label>
          <label>
            {s('groupDescription')}
            <input
              maxLength={240}
              value={groupDescription}
              onChange={(event) => {
                setGroupDescription(event.target.value);
              }}
            />
          </label>
        </div>
        <button
          className="button"
          disabled={!groupName.trim()}
          onClick={() => void createGroup()}
        >
          <Users />
          {s('createGroup')}
        </button>

        {overview.groups.map((group) => (
          <article className="section-card stack" key={group.id}>
            <div className="section-heading">
              <div>
                <strong>{group.name}</strong>
                <span className="muted">
                  {group.members.filter((member) => member.status === 'active').length}{' '}
                  {s('memberCount')}
                </span>
              </div>
            </div>
            {group.description ? <p>{group.description}</p> : null}
            {group.ownerId === user?.id && overview.friends.length > 0 ? (
              <div className="row-actions">
                <select
                  aria-label={`${s('inviteFriend')} — ${group.name}`}
                  value={selectedFriends[group.id] ?? ''}
                  onChange={(event) => {
                    setSelectedFriends((current) => ({
                      ...current,
                      [group.id]: event.target.value,
                    }));
                  }}
                >
                  <option value="">{s('selectFriend')}</option>
                  {overview.friends.map((friend) => (
                    <option value={friend.userId} key={friend.userId}>
                      {friend.displayName}
                    </option>
                  ))}
                </select>
                <button
                  className="button secondary"
                  disabled={!selectedFriends[group.id]}
                  onClick={() => void invite(group)}
                >
                  <UserPlus />
                  {s('inviteFriend')}
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </section>

      <section className="section-card stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{s('groupInvitations')}</p>
            <h2>{s('groupInvitations')}</h2>
          </div>
        </div>
        {overview.groupInvitations.length === 0 ? (
          <p className="muted">{s('noRequests')}</p>
        ) : (
          overview.groupInvitations.map((invitation) => (
            <article className="list-row" key={invitation.groupId}>
              <div>
                <strong>{invitation.groupName}</strong>
                <span className="muted">{invitation.owner.displayName}</span>
              </div>
              <div className="row-actions">
                <button
                  className="button success"
                  onClick={() =>
                    void run(
                      () =>
                        socialService.respondGroupInvitation(
                          invitation.groupId,
                          'active',
                        ),
                      s('invitationAccepted'),
                    )
                  }
                >
                  <Check />
                  {s('accept')}
                </button>
                <button
                  className="button danger"
                  onClick={() =>
                    void run(
                      () =>
                        socialService.respondGroupInvitation(
                          invitation.groupId,
                          'declined',
                        ),
                      s('decline'),
                    )
                  }
                >
                  <X />
                  {s('decline')}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
