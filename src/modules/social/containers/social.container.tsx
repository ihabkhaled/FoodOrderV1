import { ErrorState, Loading } from '@/shared/ui';

import { BucketInvitations } from '../components/bucket-invitations/bucket-invitations.component';
import { FriendSearch } from '../components/friend-search/friend-search.component';
import { FriendsList } from '../components/friends-list/friends-list.component';
import { GroupInvitations } from '../components/group-invitations/group-invitations.component';
import { GroupsSection } from '../components/groups-section/groups-section.component';
import { IncomingRequests } from '../components/incoming-requests/incoming-requests.component';
import { SocialHero } from '../components/social-hero/social-hero.component';
import { useSocial } from '../hooks/use-social.hook';

export function SocialContainer() {
  const vm = useSocial();

  if (vm.loading) return <Loading label={vm.t('loading')} />;
  if (vm.error) {
    return (
      <ErrorState
        retryLabel={vm.t('tryAgain')}
        message={vm.error}
        onRetry={vm.retry}
      />
    );
  }

  return (
    <div className="page stack-lg">
      <SocialHero
        s={vm.s}
        friendCount={vm.overview.friends.length}
        activeGroupCount={vm.activeGroupCount}
        pendingCount={
          vm.overview.incomingRequests.length +
          vm.overview.groupInvitations.length +
          (vm.overview.bucketInvitations?.length ?? 0)
        }
      />
      <BucketInvitations
        s={vm.s}
        t={vm.t}
        invitations={vm.overview.bucketInvitations ?? []}
        onRespond={(bucketId, response) =>
          void vm.respondBucketInvitation(bucketId, response)
        }
      />
      <FriendSearch
        s={vm.s}
        emailLabel={vm.t('email')}
        loadingLabel={vm.t('loading')}
        email={vm.email}
        searching={vm.searching}
        searched={vm.searched}
        result={vm.result}
        onEmailChange={vm.setEmail}
        onSearch={() => void vm.search()}
        onSendRequest={() => void vm.sendRequest()}
      />
      <IncomingRequests
        s={vm.s}
        requests={vm.overview.incomingRequests}
        onRespond={(senderUserId, response) =>
          void vm.respondFriendRequest(senderUserId, response)
        }
      />
      <FriendsList
        s={vm.s}
        friends={vm.overview.friends}
        onUnfriend={(friendUserId) => void vm.unfriend(friendUserId)}
      />
      <GroupsSection
        s={vm.s}
        userId={vm.userId}
        groups={vm.overview.groups}
        groupName={vm.groupName}
        groupDescription={vm.groupDescription}
        onGroupNameChange={vm.setGroupName}
        onGroupDescriptionChange={vm.setGroupDescription}
        onCreateGroup={() => void vm.createGroup()}
        editingGroupId={vm.editingGroupId}
        editName={vm.editName}
        editDescription={vm.editDescription}
        onEditNameChange={vm.setEditName}
        onEditDescriptionChange={vm.setEditDescription}
        onStartEditing={vm.startEditing}
        onCancelEditing={vm.cancelEditing}
        onSaveGroup={(groupId) => void vm.saveGroup(groupId)}
        onDeleteGroup={(groupId) => void vm.deleteGroup(groupId)}
        onLeaveGroup={(groupId) => void vm.leaveGroup(groupId)}
        onRemoveMember={(groupId, memberId) =>
          void vm.removeMember(groupId, memberId)
        }
        selectedFriends={vm.selectedFriends}
        onSelectFriend={vm.selectFriend}
        onInvite={(group) => void vm.invite(group)}
        availableFriends={vm.availableFriends}
      />
      <GroupInvitations
        s={vm.s}
        invitations={vm.overview.groupInvitations}
        onRespond={(groupId, response) =>
          void vm.respondGroupInvitation(groupId, response)
        }
      />
    </div>
  );
}
