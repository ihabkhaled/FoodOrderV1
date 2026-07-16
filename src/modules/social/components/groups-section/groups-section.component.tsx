import type {
  FriendGroup,
  FriendGroupMember,
  SocialUser,
} from '@/modules/data-access';
import {
  Crown,
  LogOut,
  Pencil,
  Save,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from '@/packages/icons';

import { initials } from '../../helpers/initials.helper';
import type { SocialMessageKey } from '../../i18n/social-messages.constants';

const statusMessage: Record<FriendGroupMember['status'], SocialMessageKey> = {
  active: 'active',
  pending: 'pending',
  declined: 'declined',
  removed: 'removed',
  left: 'left',
};

interface GroupsSectionProps {
  s: (key: SocialMessageKey) => string;
  userId: string | undefined;
  groups: FriendGroup[];
  groupName: string;
  groupDescription: string;
  onGroupNameChange: (value: string) => void;
  onGroupDescriptionChange: (value: string) => void;
  onCreateGroup: () => void;
  editingGroupId: string | null;
  editName: string;
  editDescription: string;
  onEditNameChange: (value: string) => void;
  onEditDescriptionChange: (value: string) => void;
  onStartEditing: (group: FriendGroup) => void;
  onCancelEditing: () => void;
  onSaveGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onLeaveGroup: (groupId: string) => void;
  onRemoveMember: (groupId: string, memberId: string) => void;
  selectedFriends: Record<string, string>;
  onSelectFriend: (groupId: string, friendId: string) => void;
  onInvite: (group: FriendGroup) => void;
  availableFriends: (group: FriendGroup) => SocialUser[];
}

export function GroupsSection({
  s,
  userId,
  groups,
  groupName,
  groupDescription,
  onGroupNameChange,
  onGroupDescriptionChange,
  onCreateGroup,
  editingGroupId,
  editName,
  editDescription,
  onEditNameChange,
  onEditDescriptionChange,
  onStartEditing,
  onCancelEditing,
  onSaveGroup,
  onDeleteGroup,
  onLeaveGroup,
  onRemoveMember,
  selectedFriends,
  onSelectFriend,
  onInvite,
  availableFriends,
}: GroupsSectionProps) {
  return (
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
              onGroupNameChange(event.target.value);
            }}
          />
        </label>
        <label>
          {s('groupDescription')}
          <input
            maxLength={240}
            value={groupDescription}
            onChange={(event) => {
              onGroupDescriptionChange(event.target.value);
            }}
          />
        </label>
      </div>
      <button
        className="button"
        disabled={!groupName.trim()}
        onClick={onCreateGroup}
      >
        <Users />
        {s('createGroup')}
      </button>

      <div className="social-divider" />

      {groups.length === 0 ? (
        <p className="muted">{s('noGroups')}</p>
      ) : (
        <div className="social-card-grid group-card-grid">
          {groups.map((group) => {
            const isOwner = group.ownerId === userId;
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
                            onStartEditing(group);
                          }}
                        >
                          <Pencil />
                        </button>
                        <button
                          className="icon-button danger-ghost"
                          title={s('deleteGroup')}
                          aria-label={`${s('deleteGroup')} ${group.name}`}
                          onClick={() => {
                            onDeleteGroup(group.id);
                          }}
                        >
                          <Trash2 />
                        </button>
                      </>
                    ) : (
                      <button
                        className="button secondary danger-ghost"
                        aria-label={`${s('leaveGroup')} ${group.name}`}
                        onClick={() => {
                          onLeaveGroup(group.id);
                        }}
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
                          onEditNameChange(event.target.value);
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
                          onEditDescriptionChange(event.target.value);
                        }}
                      />
                    </label>
                    <div className="row-actions">
                      <button
                        className="button"
                        disabled={!editName.trim()}
                        onClick={() => {
                          onSaveGroup(group.id);
                        }}
                      >
                        <Save />
                        {s('saveChanges')}
                      </button>
                      <button
                        className="button secondary"
                        onClick={onCancelEditing}
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
                              onClick={() => {
                                onRemoveMember(group.id, member.userId);
                              }}
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
                            onSelectFriend(group.id, event.target.value);
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
                        onClick={() => {
                          onInvite(group);
                        }}
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
  );
}
