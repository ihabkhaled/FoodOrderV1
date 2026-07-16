import {
  Check,
  Crown,
  LogOut,
  Pencil,
  Save,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Loading } from '@/components/Loading';
import {
  type SocialMessageKey,
  translateSocial,
} from '@/i18n/socialMessages';
import { socialService } from '@/services';
import { useApp } from '@/state/AppContext';
import type {
  FriendGroup,
  FriendGroupMember,
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

const statusMessage: Record<FriendGroupMember['status'], SocialMessageKey> = {
  active: 'active',
  pending: 'pending',
  declined: 'declined',
  removed: 'removed',
  left: 'left',
};

const initials = (name: string): string =>
  name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

export function SocialPage() {
  const { user, locale, t, showToast } = useApp();
  const s = (key: SocialMessageKey) => translateSocial(locale, key);
  const [overview, setOverview] = useState<SocialOverview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SocialUser | null>(null);
  const [searched, setSearched] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<Record<string, string>>(
    {},
  );
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

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
    await run(async () => {
      await socialService.inviteFriendToGroup(group.id, friendId);
      setSelectedFriends((current) => ({ ...current, [group.id]: '' }));
    }, s('invitationSent'));
  };

  const startEditing = (group: FriendGroup): void => {
    setEditingGroupId(group.id);
    setEditName(group.name);
    setEditDescription(group.description);
  };

  const saveGroup = async (groupId: string) => {
    await run(async () => {
      await socialService.updateGroup(groupId, editName, editDescription);
      setEditingGroupId(null);
    }, s('groupUpdated'));
  };

  const removeMember = async (
    groupId: string,
    memberId: string,
  ): Promise<void> => {
    await run(
      () => socialService.removeGroupMember(groupId, memberId),
      s('memberRemoved'),
    );
  };

  const availableFriends = (group: FriendGroup): SocialUser[] =>
    overview.friends.filter(
      (friend) =>
        !group.members.some(
          (member) =>
            member.userId === friend.userId &&
            (member.status === 'active' || member.status === 'pending'),
        ),
    );

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

  const activeGroupCount = overview.groups.filter((group) =>
    group.members.some(
      (member) => member.userId === user?.id && member.status === 'active',
    ),
  ).length;

  return (
    <div className="page stack-lg">
      <section className="section-card social-hero">
        <div className="stack">
          <div>
            <p className="eyebrow">{s('social')}</p>
            <h1>{s('social')}</h1>
          </div>
          <p className="muted">{s('socialIntro')}</p>
        </div>
        <div className="social-summary">
          <div className="social-summary-card">
            <strong>{overview.friends.length}</strong>
            <span>{s('friends')}</span>
          </div>
          <div className="social-summary-card">
            <strong>{activeGroupCount}</strong>
            <span>{s('groups')}</span>
          </div>
          <div className="social-summary-card">
            <strong>
              {overview.incomingRequests.length +
                overview.groupInvitations.length}
            </strong>
            <span>{s('pending')}</span>
          </div>
        </div>
      </section>

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
            <div className="social-person">
              <span className="social-avatar">{initials(result.displayName)}</span>
              <div>
                <strong>{result.displayName}</strong>
                <span className="muted">{result.email}</span>
              </div>
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
              <div className="social-person">
                <span className="social-avatar">
                  {initials(request.sender.displayName)}
                </span>
                <div>
                  <strong>{request.sender.displayName}</strong>
                  <span className="muted">{request.sender.email}</span>
                </div>
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
          <div className="social-card-grid">
            {overview.friends.map((friend) => (
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
                  onClick={() =>
                    void run(
                      () => socialService.unfriend(friend.userId),
                      s('friendRemoved'),
                    )
                  }
                >
                  <UserMinus />
                  {s('unfriend')}
                </button>
              </article>
            ))}
          </div>
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

        <div className="social-divider" />

        {overview.groups.length === 0 ? (
          <p className="muted">{s('noGroups')}</p>
        ) : (
          <div className="social-card-grid">
            {overview.groups.map((group) => {
              const isOwner = group.ownerId === user?.id;
              const selectableFriends = availableFriends(group);
              const activeMembers = group.members.filter(
                (member) =>
                  member.status === 'active' || member.status === 'pending',
              );
              return (
                <article
                  className="group-card"
                  key={group.id}
                  aria-label={`Group ${group.name}`}
                >
                  <div className="group-card-head">
                    <div className="group-card-title">
                      <span className="social-avatar">
                        {initials(group.name)}
                      </span>
                      <div>
                        <strong>{group.name}</strong>
                        <span className="muted">
                          {activeMembers.length} {s('memberCount')}
                        </span>
                      </div>
                    </div>
                    <div className="group-card-actions">
                      {isOwner ? (
                        <>
                          <button
                            className="icon-button"
                            title={s('editGroup')}
                            aria-label={`${s('editGroup')} ${group.name}`}
                            onClick={() => {
                              startEditing(group);
                            }}
                          >
                            <Pencil />
                          </button>
                          <button
                            className="icon-button danger-ghost"
                            title={s('deleteGroup')}
                            aria-label={`${s('deleteGroup')} ${group.name}`}
                            onClick={() =>
                              void run(
                                () => socialService.deleteGroup(group.id),
                                s('groupDeleted'),
                              )
                            }
                          >
                            <Trash2 />
                          </button>
                        </>
                      ) : (
                        <button
                          className="button secondary danger-ghost"
                          aria-label={`${s('leaveGroup')} ${group.name}`}
                          onClick={() =>
                            void run(
                              () => socialService.leaveGroup(group.id),
                              s('leftGroup'),
                            )
                          }
                        >
                          <LogOut />
                          {s('leaveGroup')}
                        </button>
                      )}
                    </div>
                  </div>

                  {editingGroupId === group.id ? (
                    <div className="group-editor">
                      <label>
                        {s('groupName')}
                        <input
                          maxLength={80}
                          value={editName}
                          onChange={(event) => {
                            setEditName(event.target.value);
                          }}
                        />
                      </label>
                      <label>
                        {s('groupDescription')}
                        <textarea
                          maxLength={240}
                          rows={3}
                          value={editDescription}
                          onChange={(event) => {
                            setEditDescription(event.target.value);
                          }}
                        />
                      </label>
                      <div className="row-actions">
                        <button
                          className="button"
                          disabled={!editName.trim()}
                          onClick={() => void saveGroup(group.id)}
                        >
                          <Save />
                          {s('saveChanges')}
                        </button>
                        <button
                          className="button secondary"
                          onClick={() => {
                            setEditingGroupId(null);
                          }}
                        >
                          <X />
                          {s('cancelEdit')}
                        </button>
                      </div>
                    </div>
                  ) : group.description ? (
                    <p className="muted">{group.description}</p>
                  ) : null}

                  <div className="stack">
                    <strong>{s('groupMembers')}</strong>
                    <div className="group-member-list">
                      {activeMembers.map((member) => (
                        <div className="group-member-row" key={member.userId}>
                          <div className="social-person">
                            <span className="social-avatar">
                              {initials(member.displayName)}
                            </span>
                            <div>
                              <strong>{member.displayName}</strong>
                              <span className="muted">{member.email}</span>
                            </div>
                          </div>
                          <div className="group-member-meta">
                            {member.userId === group.ownerId ? (
                              <span className="member-status active">
                                <Crown />
                                {s('groupOwner')}
                              </span>
                            ) : (
                              <span className={`member-status ${member.status}`}>
                                {s(statusMessage[member.status])}
                              </span>
                            )}
                            {isOwner && member.userId !== group.ownerId ? (
                              <button
                                className="icon-button danger-ghost"
                                title={s('removeMember')}
                                aria-label={`${s('removeMember')} ${member.displayName}`}
                                onClick={() =>
                                  void removeMember(group.id, member.userId)
                                }
                              >
                                <UserMinus />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isOwner ? (
                    selectableFriends.length > 0 ? (
                      <div className="group-invite-row">
                        <label>
                          {s('availableFriends')}
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
                            {selectableFriends.map((friend) => (
                              <option value={friend.userId} key={friend.userId}>
                                {friend.displayName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          className="button secondary"
                          disabled={!selectedFriends[group.id]}
                          onClick={() => void invite(group)}
                        >
                          <UserPlus />
                          {s('inviteFriend')}
                        </button>
                      </div>
                    ) : (
                      <p className="muted">{s('noAvailableFriends')}</p>
                    )
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
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
