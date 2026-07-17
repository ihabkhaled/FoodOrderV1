import { useCallback, useEffect, useState } from 'react';

import type {
  FriendGroup,
  SocialOverview,
  SocialUser,
} from '@/modules/data-access';
import { socialService } from '@/modules/data-access';
import { useApp } from '@/modules/session';
import type { MessageKey } from '@/shared/i18n';

import type { SocialMessageKey } from '../i18n/social-messages.constants';
import { translateSocial } from '../i18n/translate-social.helper';

const emptyOverview = (): SocialOverview => ({
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  groups: [],
  groupInvitations: [],
  bucketInvitations: [],
});

export interface SocialViewModel {
  t: (key: MessageKey) => string;
  s: (key: SocialMessageKey) => string;
  userId: string | undefined;
  overview: SocialOverview;
  loading: boolean;
  error: string;
  retry: () => void;
  activeGroupCount: number;
  email: string;
  setEmail: (value: string) => void;
  searching: boolean;
  searched: boolean;
  result: SocialUser | null;
  search: () => Promise<void>;
  sendRequest: () => Promise<void>;
  respondFriendRequest: (
    senderUserId: string,
    response: 'accepted' | 'declined',
  ) => Promise<void>;
  unfriend: (friendUserId: string) => Promise<void>;
  groupName: string;
  setGroupName: (value: string) => void;
  groupDescription: string;
  setGroupDescription: (value: string) => void;
  createGroup: () => Promise<void>;
  selectedFriends: Record<string, string>;
  selectFriend: (groupId: string, friendId: string) => void;
  invite: (group: FriendGroup) => Promise<void>;
  editingGroupId: string | null;
  editName: string;
  setEditName: (value: string) => void;
  editDescription: string;
  setEditDescription: (value: string) => void;
  startEditing: (group: FriendGroup) => void;
  cancelEditing: () => void;
  saveGroup: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  removeMember: (groupId: string, memberId: string) => Promise<void>;
  availableFriends: (group: FriendGroup) => SocialUser[];
  respondGroupInvitation: (
    groupId: string,
    response: 'active' | 'declined',
  ) => Promise<void>;
  respondBucketInvitation: (
    bucketId: string,
    response: 'accepted' | 'declined',
  ) => Promise<void>;
}

export function useSocial(): SocialViewModel {
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

  const retry = (): void => {
    setLoading(true);
    void load();
  };

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

  const respondFriendRequest = async (
    senderUserId: string,
    response: 'accepted' | 'declined',
  ): Promise<void> => {
    await run(
      () => socialService.respondFriendRequest(senderUserId, response),
      s(response === 'accepted' ? 'accept' : 'decline'),
    );
  };

  const unfriend = async (friendUserId: string): Promise<void> => {
    await run(() => socialService.unfriend(friendUserId), s('friendRemoved'));
  };

  const createGroup = async () => {
    await run(async () => {
      await socialService.createGroup(groupName, groupDescription);
      setGroupName('');
      setGroupDescription('');
    }, s('groupCreated'));
  };

  const selectFriend = (groupId: string, friendId: string): void => {
    setSelectedFriends((current) => ({ ...current, [groupId]: friendId }));
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

  const cancelEditing = (): void => {
    setEditingGroupId(null);
  };

  const saveGroup = async (groupId: string) => {
    await run(async () => {
      await socialService.updateGroup(groupId, editName, editDescription);
      setEditingGroupId(null);
    }, s('groupUpdated'));
  };

  const deleteGroup = async (groupId: string): Promise<void> => {
    await run(() => socialService.deleteGroup(groupId), s('groupDeleted'));
  };

  const leaveGroup = async (groupId: string): Promise<void> => {
    await run(() => socialService.leaveGroup(groupId), s('leftGroup'));
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

  const respondGroupInvitation = async (
    groupId: string,
    response: 'active' | 'declined',
  ): Promise<void> => {
    await run(
      () => socialService.respondGroupInvitation(groupId, response),
      s(response === 'active' ? 'invitationAccepted' : 'decline'),
    );
  };

  const respondBucketInvitation = async (
    bucketId: string,
    response: 'accepted' | 'declined',
  ): Promise<void> => {
    await run(
      () => socialService.respondBucketInvitation(bucketId, response),
      s(
        response === 'accepted'
          ? 'bucketInvitationAccepted'
          : 'bucketInvitationDeclined',
      ),
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

  const activeGroupCount = overview.groups.filter((group) =>
    group.members.some(
      (member) => member.userId === user?.id && member.status === 'active',
    ),
  ).length;

  return {
    t,
    s,
    userId: user?.id,
    overview,
    loading,
    error,
    retry,
    activeGroupCount,
    email,
    setEmail,
    searching,
    searched,
    result,
    search,
    sendRequest,
    respondFriendRequest,
    unfriend,
    groupName,
    setGroupName,
    groupDescription,
    setGroupDescription,
    createGroup,
    selectedFriends,
    selectFriend,
    invite,
    editingGroupId,
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    startEditing,
    cancelEditing,
    saveGroup,
    deleteGroup,
    leaveGroup,
    removeMember,
    availableFriends,
    respondGroupInvitation,
    respondBucketInvitation,
  };
}
