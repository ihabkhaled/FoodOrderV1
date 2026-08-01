import { BackLink, ConfirmDialog, ErrorState, FeatureTour, Loading } from '@/shared/ui';

import { BucketMemberPermissionsPanel } from '../components/bucket-member-permissions-panel/bucket-member-permissions-panel.component';
import { useBucketShare } from '../hooks/use-bucket-share.hook';
import { useBucketShareMembersTour } from '../hooks/use-bucket-share-members-tour.hook';
import { buildBucketShareRoute } from '../routes/group-orders-route-paths.constants';

/** Member roles, custom permissions, and removal — apart from the invite flow. */
export function BucketShareMembersContainer() {
  const vm = useBucketShare();
  const { steps: tourSteps } = useBucketShareMembersTour();

  if (vm.loading) return <Loading label={vm.t('loading')} />;
  if (!vm.view || vm.error) {
    return (
      <ErrorState
        retryLabel={vm.t('tryAgain')}
        message={vm.error || vm.t('notAllowed')}
        onRetry={vm.reload}
      />
    );
  }

  const { bucket, members } = vm.view;

  return (
    <div className="page narrow stack-lg">
      <div className="page-heading">
        <div>
          <BackLink
            fallback={buildBucketShareRoute(bucket.id)}
            label={vm.t('back')}
          />
          <p className="eyebrow">{bucket.title}</p>
          <h1>{vm.t('members')}</h1>
        </div>
      </div>
      <BucketMemberPermissionsPanel
        members={members}
        currentUserId={vm.user?.id ?? bucket.ownerId}
        locale={vm.locale}
        translate={vm.t}
        onRoleChange={(member, role) => {
          void vm.changeRole(member, role);
        }}
        onPermissionChange={(member, patch) => {
          void vm.changeCustomPermissions(member, patch);
        }}
        onRemove={vm.setRemoving}
      />
      <ConfirmDialog
        open={Boolean(vm.removing)}
        title={vm.t('removeMember')}
        message={vm.t('confirmRemoveMember')}
        confirmLabel={vm.t('removeMember')}
        cancelLabel={vm.t('cancel')}
        danger
        onConfirm={() => {
          void vm.removeMember();
        }}
        onCancel={() => {
          vm.setRemoving(null);
        }}
      />

      <FeatureTour
        page="bucket-share-members"
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
