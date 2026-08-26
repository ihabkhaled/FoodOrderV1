import { GroupInviteLinkContainer } from '@/modules/invite-links';
import { BackLink, ErrorState, FeatureTour, SkeletonSection } from '@/shared/ui';

import { GroupsSection } from '../components/groups-section/groups-section.component';
import { useSocial } from '../hooks/use-social.hook';
import { useSocialGroupsTour } from '../hooks/use-social-groups-tour.hook';
import { SOCIAL_PATH } from '../routes/social-route-paths.constants';

/** Creating, editing, and inviting into groups, on its own page. */
export function SocialGroupsContainer() {
  const vm = useSocial();
  const { steps: tourSteps } = useSocialGroupsTour();

  if (vm.loading) {
    return (
      <div className="page narrow stack-lg">
        <SkeletonSection label={vm.t('loading')} variant="card" count={2} />
      </div>
    );
  }
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
    <div className="page narrow stack-lg">
      <div className="page-heading">
        <div>
          <BackLink fallback={SOCIAL_PATH} label={vm.t('back')} />
          <h1>{vm.s('groups')}</h1>
        </div>
      </div>
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
        renderInviteLink={(group) => (
          <GroupInviteLinkContainer groupId={group.id} groupName={group.name} />
        )}
        availableFriends={vm.availableFriends}
      />

      <FeatureTour
        page="social-groups"
        steps={tourSteps}
        nextLabel={vm.t('tourNext')}
        doneLabel={vm.t('tourDone')}
        skipLabel={vm.t('tourSkip')}
        closeLabel={vm.t('close')}
        skipAllLabel={vm.t('tourSkipAll')}
      />
    </div>
  );
}
